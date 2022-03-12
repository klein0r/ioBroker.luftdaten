/* jshint -W097 */
/* jshint strict: false */
/* jslint node: true */
'use strict';

const utils = require('@iobroker/adapter-core');
const axios = require('axios');
const adapterName = require('./package.json').name.split('.').pop();

axios.interceptors.request.use(x => {
    x.meta = x.meta || {};
    x.meta.requestStartedAt = new Date().getTime();
    return x;
});

axios.interceptors.response.use(x => {
    x.responseTime = new Date().getTime() - x.config.meta.requestStartedAt;
    return x;
});

class Luftdaten extends utils.Adapter {

    constructor(options) {
        super({
            ...options,
            name: adapterName,
        });

        this.on('ready', this.onReady.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    async onReady() {
        this.getDevices(
            async (err, states) => {

                const sensorsAll = [];
                const sensorsKeep = [];

                // Collect all types
                if (states) {
                    for (let i = 0; i < states.length; i++) {
                        const id = this.removeNamespace(states[i]._id);

                        // Check if the state is a direct child (device)
                        if (id.indexOf('.') === -1) {
                            sensorsAll.push(id);
                            this.log.debug(`[onReady] sensor device exists: ${id}`);
                        }
                    }
                }

                const sensors = this.config.sensors;

                if (sensors && Array.isArray(sensors)) {
                    this.log.debug(`[onReady] Found ${sensors.length} sensors, fetching data`);

                    for (const s in sensors) {
                        const sensor = sensors[s];

                        try {
                            const sensorName = await this.getSensorData(sensor);

                            if (sensorName) {
                                sensorsKeep.push(sensorName);
                                this.log.debug(`[onReady] sensor data added: ${sensorName}`);
                            }
                        } catch (err) {
                            this.log.debug(`[onReady] sensor error: ${err}`);
                        }
                    }
                } else {
                    this.log.error('[onReady] no sensors configured');
                }

                // Delete non existent sensors
                for (let i = 0; i < sensorsAll.length; i++) {
                    const id = sensorsAll[i];

                    if (sensorsKeep.indexOf(id) === -1) {
                        await this.delObjectAsync(id, {recursive: true});
                    }
                }

                this.stop();
            }
        );
    }

    async getSensorData(sensor) {
        return new Promise(async (resolve, reject) => {

            const unitList = {
                P1: 'µg/m³',
                P2: 'µg/m³',
                temperature: '°C',
                humidity: '%',
                pressure: 'Pa',
                pressure_at_sealevel: 'Pa',
                noise: 'dB(A)',
                signal: 'dB(A)',
                min_micro: 'µs',
                max_micro: 'µs'
            };

            const roleList = {
                P1: 'value.ppm',
                P2: 'value.ppm',
                temperature: 'value.temperature',
                humidity: 'value.humidity',
                pressure: 'value.pressure',
                pressure_at_sealevel: 'value.pressure',
                noise: 'value',
                signal: 'value',
                min_micro: 'value',
                max_micro: 'value'
            };

            const sensorType = sensor.type;
            const sensorIdentifier = sensor.identifier;
            const sensorName = (sensor.name === '') ? sensorIdentifier : sensor.name;

            if (sensorIdentifier && sensorName) {
                const deviceName = (sensorType == 'local') ? sensorIdentifier.replace(/\./g, '_') : sensorIdentifier.replace(/\D/g,'');
                const path = deviceName + '.';

                if (!deviceName) {
                    reject('Device name is empty. Check configuration.');
                }

                this.log.debug(`[getSensorData] sensor "${sensorName}" with type: "${sensorType}", identifier: "${sensorIdentifier}", device: "${deviceName}"`);

                await this.setObjectNotExistsAsync(deviceName, {
                    type: 'device',
                    common: {
                        name: sensorName
                    },
                    native: {}
                });

                this.extendObjectAsync(deviceName, {
                    common: {
                        name: sensorName
                    }
                });

                await this.setObjectNotExistsAsync(path + 'name', {
                    type: 'state',
                    common: {
                        name: {
                            en: 'Sensor name',
                            de: 'Sensorname',
                            ru: 'Имя датчика',
                            pt: 'Nome do sensor',
                            nl: 'Sensornaam',
                            fr: 'Nom du capteur',
                            it: 'Nome del sensore',
                            es: 'Nombre del sensor',
                            pl: 'Nazwa czujnika',
                            'zh-cn': '传感器名称'
                        },
                        type: 'string',
                        role: 'text',
                        read: true,
                        write: false
                    },
                    native: {}
                });
                await this.setStateAsync(path + 'name', {val: sensorName, ack: true});

                await this.setObjectNotExistsAsync(path + 'responseCode', {
                    type: 'state',
                    common: {
                        name: {
                            en: 'Response Code',
                            de: 'Antwortcode',
                            ru: 'Код ответа',
                            pt: 'Código de resposta',
                            nl: 'Reactiecode',
                            fr: 'Code de réponse',
                            it: 'Codice di risposta',
                            es: 'Código de respuesta',
                            pl: 'Kod odpowiedzi',
                            'zh-cn': '响应代码'
                        },
                        type: 'number',
                        role: 'value',
                        read: true,
                        write: false
                    },
                    native: {}
                });

                if (sensorType == 'local') {
                    const sensorUrl = `https://${sensorIdentifier}/data.json`;

                    this.log.debug(`[getSensorData] local request started (timeout ${this.config.requestTimeout}s): ${sensorUrl}`);

                    axios({
                        method: 'get',
                        url: sensorUrl,
                        timeout: this.config.requestTimeout * 1000,
                        responseType: 'json'
                    }).then(async (response) => {
                        const content = response.data;

                        this.log.debug(`[getSensorData] local request done after ${response.responseTime/1000}s - received data (${response.status}): ${JSON.stringify(content)}`);

                        await this.setStateAsync(path + 'responseCode', {val: response.status, ack: true});

                        if (content && Object.prototype.hasOwnProperty.call(content, 'sensordatavalues')) {
                            for (const key in content.sensordatavalues) {
                                const obj = content.sensordatavalues[key];

                                let unit = null;
                                let role = 'value';

                                if (obj.value_type.indexOf('SDS_') == 0) {
                                    unit = 'µg/m³';
                                    role = 'value.ppm';
                                } else if (obj.value_type.indexOf('temperature') >= 0) {
                                    unit = '°C';
                                    role = 'value.temperature';
                                } else if (obj.value_type.indexOf('humidity') >= 0) {
                                    unit = '%';
                                    role = 'value.humidity';
                                } else if (obj.value_type.indexOf('pressure') >= 0) {
                                    unit = 'Pa';
                                    role = 'value.pressure';
                                } else if (obj.value_type.indexOf('noise') >= 0) {
                                    unit = 'dB(A)';
                                    role = 'value';
                                } else if (Object.prototype.hasOwnProperty.call(unitList, obj.value_type)) {
                                    unit = unitList[obj.value_type];
                                    role = roleList[obj.value_type];
                                }

                                await this.setObjectNotExistsAsync(path + obj.value_type, {
                                    type: 'state',
                                    common: {
                                        name: obj.value_type,
                                        type: 'number',
                                        role: role,
                                        unit: unit,
                                        read: true,
                                        write: false
                                    },
                                    native: {}
                                });
                                await this.setStateAsync(path + obj.value_type, {val: parseFloat(obj.value), ack: true});
                            }
                        }

                        resolve(deviceName);
                    }).catch(async (error) => {
                        if (error.response) {
                            // The request was made and the server responded with a status code

                            this.log.warn(`[getSensorData] received error ${error.response.status} response from local sensor ${sensorIdentifier} with content: ${JSON.stringify(error.response.data)}`);
                            await this.setStateAsync(path + 'responseCode', {val: error.response.status, ack: true});
                        } else if (error.request) {
                            // The request was made but no response was received
                            // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                            // http.ClientRequest in node.js<div></div>
                            this.log.info(error.message);
                            await this.setStateAsync(path + 'responseCode', -1, true);
                        } else {
                            // Something happened in setting up the request that triggered an Error
                            this.log.info(error.message);
                            await this.setStateAsync(path + 'responseCode', -99, true);
                        }

                        reject('http error');
                    });

                } else if (sensorType == 'remote') {
                    const sensorUrl = `https://data.sensor.community/airrohr/v1/sensor/${sensorIdentifier.replace(/\D/g,'')}/`;

                    this.log.debug(`[getSensorData] remote request started (timeout ${this.config.requestTimeout}s): ${sensorUrl}`);

                    axios({
                        method: 'get',
                        url: sensorUrl,
                        timeout: this.config.requestTimeout * 1000,
                        responseType: 'json'
                    }).then(async (response) => {
                        const content = response.data;

                        this.log.debug(`[getSensorData] remote request done after ${response.responseTime/1000}s - received data (${response.status}): ${JSON.stringify(content)}`);

                        await this.setStateAsync(path + 'responseCode', {val: response.status, ack: true});

                        if (content && Array.isArray(content) && content.length > 0) {
                            const sensorData = content[0];

                            if (sensorData && Object.prototype.hasOwnProperty.call(sensorData, 'sensordatavalues')) {
                                for (const key in sensorData.sensordatavalues) {
                                    const obj = sensorData.sensordatavalues[key];

                                    let unit = null;
                                    let role = 'value';

                                    if (obj.value_type.indexOf('noise') >= 0) {
                                        unit = 'dB(A)';
                                        role = 'value';
                                    } else if (Object.prototype.hasOwnProperty.call(unitList, obj.value_type)) {
                                        unit = unitList[obj.value_type];
                                        role = roleList[obj.value_type];
                                    }

                                    await this.setObjectNotExistsAsync(path + 'SDS_' + obj.value_type, {
                                        type: 'state',
                                        common: {
                                            name: obj.value_type,
                                            type: 'number',
                                            role: role,
                                            unit: unit,
                                            read: true,
                                            write: false
                                        },
                                        native: {}
                                    });
                                    await this.setStateAsync(path + 'SDS_' + obj.value_type, {val: parseFloat(obj.value), ack: true});
                                }
                            }

                            if (Object.prototype.hasOwnProperty.call(sensorData, 'location')) {
                                await this.setObjectNotExistsAsync(path + 'location', {
                                    type: 'channel',
                                    common: {
                                        name: {
                                            en: 'Location',
                                            de: 'Standort',
                                            ru: 'Место нахождения',
                                            pt: 'Localização',
                                            nl: 'Plaats',
                                            fr: 'Emplacement',
                                            it: 'Posizione',
                                            es: 'Localización',
                                            pl: 'Lokalizacja',
                                            'zh-cn': '地点'
                                        },
                                        role: 'value.gps'
                                    },
                                    native: {}
                                });

                                await this.setObjectNotExistsAsync(path + 'location.longitude', {
                                    type: 'state',
                                    common: {
                                        name: {
                                            en: 'Longtitude',
                                            de: 'Längengrad',
                                            ru: 'Долгота',
                                            pt: 'Longitude',
                                            nl: 'lengtegraad',
                                            fr: 'Longitude',
                                            it: 'longitudine',
                                            es: 'Longitud',
                                            pl: 'Długość geograficzna',
                                            'zh-cn': '经度'
                                        },
                                        type: 'number',
                                        role: 'value.gps.longitude',
                                        unit: '°',
                                        read: true,
                                        write: false
                                    },
                                    native: {}
                                });
                                await this.setStateAsync(path + 'location.longitude', {val: parseFloat(sensorData.location.longitude), ack: true});

                                await this.setObjectNotExistsAsync(path + 'location.latitude', {
                                    type: 'state',
                                    common: {
                                        name: {
                                            en: 'Latitude',
                                            de: 'Breite',
                                            ru: 'Широта',
                                            pt: 'Latitude',
                                            nl: 'Breedtegraad',
                                            fr: 'Latitude',
                                            it: 'Latitudine',
                                            es: 'Latitud',
                                            pl: 'Szerokość',
                                            'zh-cn': '纬度'
                                        },
                                        type: 'number',
                                        role: 'value.gps.latitude',
                                        unit: '°',
                                        read: true,
                                        write: false
                                    },
                                    native: {}
                                });
                                await this.setStateAsync(path + 'location.latitude', {val: parseFloat(sensorData.location.latitude), ack: true});

                                await this.setObjectNotExistsAsync(path + 'location.altitude', {
                                    type: 'state',
                                    common: {
                                        name: {
                                            en: 'Altitude',
                                            de: 'Höhe',
                                            ru: 'Высота',
                                            pt: 'Altitude',
                                            nl: 'Hoogte',
                                            fr: 'Altitude',
                                            it: 'Altitudine',
                                            es: 'Altitud',
                                            pl: 'Wysokość',
                                            'zh-cn': '高度'
                                        },
                                        type: 'number',
                                        role: 'value.gps.elevation',
                                        unit: 'm',
                                        read: true,
                                        write: false
                                    },
                                    native: {}
                                });
                                await this.setStateAsync(path + 'location.altitude', {val: parseFloat(sensorData.location.altitude), ack: true});

                                await this.setObjectNotExistsAsync(path + 'timestamp', {
                                    type: 'state',
                                    common: {
                                        name: {
                                            en: 'Last Update',
                                            de: 'Letztes Update',
                                            ru: 'Последнее обновление',
                                            pt: 'Última atualização',
                                            nl: 'Laatste update',
                                            fr: 'Dernière mise à jour',
                                            it: 'Ultimo aggiornamento',
                                            es: 'Última actualización',
                                            pl: 'Ostatnia aktualizacja',
                                            'zh-cn': '最后更新'
                                        },
                                        type: 'number',
                                        role: 'date',
                                        read: true,
                                        write: false
                                    },
                                    native: {}
                                });
                                await this.setStateAsync(path + 'timestamp', {val: new Date(sensorData.timestamp).getTime(), ack: true});
                            }
                        }

                        resolve(deviceName);
                    }).catch(async (error) => {
                        if (error.response) {
                            // The request was made and the server responded with a status code

                            this.log.warn(`[getSensorData] received error ${error.response.status} response from remote sensor ${sensorIdentifier} with content: ${JSON.stringify(error.response.data)}`);
                            await this.setStateAsync(path + 'responseCode', {val: error.response.status, ack: true});
                        } else if (error.request) {
                            // The request was made but no response was received
                            // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                            // http.ClientRequest in node.js
                            this.log.info(error.message);
                            await this.setStateAsync(path + 'responseCode', -1, true);
                        } else {
                            // Something happened in setting up the request that triggered an Error
                            this.log.info(error.message);
                            await this.setStateAsync(path + 'responseCode', -99, true);
                        }

                        reject('http error');
                    });
                } else {
                    reject('unknown sensor type');
                }
            } else {
                reject('sensor type and/or sensor identifier not defined');
            }
        });
    }

    removeNamespace(id) {
        const re = new RegExp(this.namespace + '*\\.', 'g');
        return id.replace(re, '');
    }

    onUnload(callback) {
        try {
            this.log.debug('cleaned everything up...');
            callback();
        } catch (e) {
            callback();
        }
    }
}

// @ts-ignore parent is a valid property on module
if (module.parent) {
    // Export the constructor in compact mode
    /**
     * @param {Partial<ioBroker.AdapterOptions>} [options={}]
     */
    module.exports = (options) => new Luftdaten(options);
} else {
    // otherwise start the instance directly
    new Luftdaten();
}
