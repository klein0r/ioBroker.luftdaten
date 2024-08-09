'use strict';

const utils = require('@iobroker/adapter-core');
const axios = require('axios').default;
const adapterName = require('./package.json').name.split('.').pop();

axios.interceptors.request.use((x) => {
    x.meta = x.meta || {};
    x.meta.requestStartedAt = new Date().getTime();
    return x;
});

axios.interceptors.response.use((x) => {
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
        const sensorsAll = [];
        const sensorsKeep = [];

        try {
            const devices = await this.getDevicesAsync();

            if (devices && devices.length) {
                for (let i = 0; i < devices.length; i++) {
                    const idNoNamespace = this.removeNamespace(devices[i]._id);

                    // Check if the state is a direct child (device)
                    if (idNoNamespace.indexOf('.') === -1) {
                        sensorsAll.push(idNoNamespace);
                        this.log.debug(`[onReady] sensor deviceId exists: "${idNoNamespace}"`);
                    }
                }
            }

            const sensors = this.config.sensors;
            let successfullyFilled = 0;

            if (sensors && Array.isArray(sensors)) {
                this.log.debug(`[onReady] found ${sensors.length} sensors in configuration, requesting data`);

                for (const s in sensors) {
                    const sensorIndex = parseInt(s) + 1;
                    const sensor = sensors[s];
                    const sensorIdentifier = sensor.identifier;
                    const deviceId = sensor.type == 'local' ? sensorIdentifier.replace(/\./g, '_') : sensorIdentifier.replace(/\D/g, '');

                    if (deviceId) {
                        sensorsKeep.push(deviceId);

                        this.log.debug(`[onReady] sensor ${sensorIndex}/${sensors.length} with idenfitier "${sensorIdentifier}" will be saved as deviceId "${deviceId}"`);

                        try {
                            const responseTime = await this.fillSensorData(deviceId, sensor);
                            this.log.debug(`[onReady] sensor ${sensorIndex}/${sensors.length} - data of deviceId  "${deviceId}" filled in ${responseTime / 1000}s`);
                            successfullyFilled++;
                        } catch (err) {
                            this.log.debug(`[onReady] sensor ${sensorIndex}/${sensors.length} - error of deviceId "${deviceId}": ${err}`);
                        }
                    } else {
                        this.log.error(`[onReady] sensor ${sensorIndex}/${sensors.length} identifier missing or invalid: "${sensorIdentifier}" - check instance configuration`);
                    }
                }

                this.log.debug(`[onReady] successfully filled ${successfullyFilled} of ${sensors.length} sensors`);
            } else {
                this.log.error('[onReady] no sensors configured - check instance configuration');
            }

            // Delete non existent sensors
            for (let i = 0; i < sensorsAll.length; i++) {
                const id = sensorsAll[i];

                if (sensorsKeep.indexOf(id) === -1) {
                    await this.delObjectAsync(id, { recursive: true });
                    this.log.debug(`[onReady] deleted deviceId: "${id}"`);
                }
            }
        } catch (err) {
            this.log.error(`[onReady] error: ${err}`);
        } finally {
            this.log.debug(`[onReady] finished - stopping instance`);
            this.stop();
        }
    }

    async fillSensorData(deviceId, sensor) {
        const sensorType = sensor.type;
        const sensorName = sensor.name === '' ? sensor.identifier : sensor.name;

        this.log.debug(`[fillSensorData] sensor "${sensorName}" with type: "${sensorType}", identifier: "${sensor.identifier}", deviceId: "${deviceId}"`);

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
            max_micro: 'µs',
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
            max_micro: 'value',
        };

        await this.setObjectNotExistsAsync(deviceId, {
            type: 'device',
            common: {
                name: sensorName,
            },
            native: {},
        });

        await this.extendObjectAsync(deviceId, {
            common: {
                name: sensorName,
            },
        });

        await this.setObjectNotExistsAsync(`${deviceId}.name`, {
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
                    uk: 'Назва датчика',
                    'zh-cn': '传感器名称',
                },
                type: 'string',
                role: 'text',
                read: true,
                write: false,
            },
            native: {},
        });
        await this.setStateChangedAsync(`${deviceId}.name`, { val: sensorName, ack: true });

        await this.setObjectNotExistsAsync(`${deviceId}.responseCode`, {
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
                    uk: 'Код відгуку',
                    'zh-cn': '响应代码',
                },
                type: 'number',
                role: 'value',
                read: true,
                write: false,
            },
            native: {},
        });

        return new Promise((resolve, reject) => {
            if (sensorType == 'local') {
                const sensorUrl = `http://${sensor.identifier}/data.json`;

                this.log.debug(`[fillSensorData] local request started (timeout ${this.config.requestTimeout}s): ${sensorUrl}`);

                const source = axios.CancelToken.source();
                const abortTimeout = this.setTimeout(() => {
                    this.log.debug(`[fillSensorData] local request takes too much time - aborting ...`);
                    source.cancel();
                }, this.config.requestTimeout * 1000);

                axios({
                    method: 'get',
                    url: sensorUrl,
                    timeout: this.config.requestTimeout * 1000,
                    cancelToken: source.token,
                    responseType: 'json',
                })
                    .then(async (response) => {
                        this.clearTimeout(abortTimeout);
                        const content = response.data;

                        this.log.debug(`[fillSensorData] local request done after ${response.responseTime / 1000}s - received data (${response.status}): ${JSON.stringify(content)}`);

                        await this.setStateAsync(`${deviceId}.responseCode`, { val: response.status, ack: true });

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

                                await this.setObjectNotExistsAsync(`${deviceId}.${obj.value_type}`, {
                                    type: 'state',
                                    common: {
                                        name: obj.value_type,
                                        type: 'number',
                                        role: role,
                                        unit: unit,
                                        read: true,
                                        write: false,
                                    },
                                    native: {},
                                });
                                await this.setStateChangedAsync(`${deviceId}.${obj.value_type}`, { val: parseFloat(obj.value), ack: true });
                            }
                        }

                        resolve(response.responseTime);
                    })
                    .catch(async (error) => {
                        if (axios.isCancel(error)) {
                            await this.setStateAsync(`${deviceId}.responseCode`, { val: -2, ack: true });
                        } else if (error.response) {
                            // The request was made and the server responded with a status code

                            this.log.warn(
                                `[fillSensorData] received error ${error.response.status} response from local sensor ${sensor.identifier} with content: ${JSON.stringify(error.response.data)}`,
                            );
                            await this.setStateAsync(`${deviceId}.responseCode`, { val: error.response.status, ack: true });
                        } else if (error.request) {
                            // The request was made but no response was received
                            // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                            // http.ClientRequest in node.js<div></div>
                            this.log.info(`[fillSensorData] error: ${error.message}`);
                            await this.setStateAsync(`${deviceId}.responseCode`, { val: -1, ack: true });
                        } else {
                            // Something happened in setting up the request that triggered an Error
                            this.log.info(`[fillSensorData] error: ${error.message}`);
                            await this.setStateAsync(`${deviceId}.responseCode`, { val: -99, ack: true });
                        }

                        reject('http error');
                    });
            } else if (sensorType == 'remote') {
                const sensorUrl = `https://data.sensor.community/airrohr/v1/sensor/${sensor.identifier.replace(/\D/g, '')}/`;

                this.log.debug(`[fillSensorData] remote request started (timeout ${this.config.requestTimeout}s): ${sensorUrl}`);

                const source = axios.CancelToken.source();
                const abortTimeout = this.setTimeout(() => {
                    this.log.debug(`[fillSensorData] remote request takes too much time - aborting ...`);
                    source.cancel();
                }, this.config.requestTimeout * 1000);

                axios({
                    method: 'get',
                    url: sensorUrl,
                    timeout: this.config.requestTimeout * 1000,
                    cancelToken: source.token,
                    responseType: 'json',
                })
                    .then(async (response) => {
                        this.clearTimeout(abortTimeout);
                        const content = response.data;

                        this.log.debug(`[fillSensorData] remote request done after ${response.responseTime / 1000}s - received data (${response.status}): ${JSON.stringify(content)}`);

                        await this.setStateAsync(`${deviceId}.responseCode`, { val: response.status, ack: true });

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

                                    await this.setObjectNotExistsAsync(`${deviceId}.SDS_${obj.value_type}`, {
                                        type: 'state',
                                        common: {
                                            name: obj.value_type,
                                            type: 'number',
                                            role: role,
                                            unit: unit,
                                            read: true,
                                            write: false,
                                        },
                                        native: {},
                                    });
                                    await this.setStateChangedAsync(`${deviceId}.SDS_${obj.value_type}`, { val: parseFloat(obj.value), ack: true });
                                }
                            }

                            if (Object.prototype.hasOwnProperty.call(sensorData, 'location')) {
                                await this.setObjectNotExistsAsync(`${deviceId}.location`, {
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
                                            uk: 'Місцезнаходження',
                                            'zh-cn': '地点',
                                        },
                                        role: 'value.gps',
                                    },
                                    native: {},
                                });

                                await this.setObjectNotExistsAsync(`${deviceId}.location.longitude`, {
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
                                            uk: 'Довгота',
                                            'zh-cn': '经度',
                                        },
                                        type: 'number',
                                        role: 'value.gps.longitude',
                                        unit: '°',
                                        read: true,
                                        write: false,
                                    },
                                    native: {},
                                });
                                await this.setStateChangedAsync(`${deviceId}.location.longitude`, { val: parseFloat(sensorData.location.longitude), ack: true });

                                await this.setObjectNotExistsAsync(`${deviceId}.location.latitude`, {
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
                                            uk: 'Прованс',
                                            'zh-cn': '纬度',
                                        },
                                        type: 'number',
                                        role: 'value.gps.latitude',
                                        unit: '°',
                                        read: true,
                                        write: false,
                                    },
                                    native: {},
                                });
                                await this.setStateChangedAsync(`${deviceId}.location.latitude`, { val: parseFloat(sensorData.location.latitude), ack: true });

                                await this.setObjectNotExistsAsync(`${deviceId}.location.altitude`, {
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
                                            uk: 'Сортування',
                                            'zh-cn': '高度',
                                        },
                                        type: 'number',
                                        role: 'value.gps.elevation',
                                        unit: 'm',
                                        read: true,
                                        write: false,
                                    },
                                    native: {},
                                });
                                await this.setStateChangedAsync(`${deviceId}.location.altitude`, { val: parseFloat(sensorData.location.altitude), ack: true });
                            }

                            await this.setObjectNotExistsAsync(`${deviceId}.timestamp`, {
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
                                        uk: 'Останнє оновлення',
                                        'zh-cn': '最后更新',
                                    },
                                    type: 'number',
                                    role: 'date',
                                    read: true,
                                    write: false,
                                },
                                native: {},
                            });
                            await this.setStateChangedAsync(`${deviceId}.timestamp`, { val: new Date(sensorData.timestamp).getTime(), ack: true });
                        }

                        resolve(response.responseTime);
                    })
                    .catch(async (error) => {
                        if (axios.isCancel(error)) {
                            await this.setStateAsync(`${deviceId}.responseCode`, { val: -2, ack: true });
                        } else if (error.response) {
                            // The request was made and the server responded with a status code

                            this.log.warn(
                                `[fillSensorData] received error ${error.response.status} response from remote sensor ${sensor.identifier} with content: ${JSON.stringify(error.response.data)}`,
                            );
                            await this.setStateAsync(`${deviceId}.responseCode`, { val: error.response.status, ack: true });
                        } else if (error.request) {
                            // The request was made but no response was received
                            // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                            // http.ClientRequest in node.js
                            this.log.info(`[fillSensorData] error: ${error.message}`);
                            await this.setStateAsync(`${deviceId}.responseCode`, { val: -1, ack: true });
                        } else {
                            // Something happened in setting up the request that triggered an Error
                            this.log.info(`[fillSensorData] error: ${error.message}`);
                            await this.setStateAsync(`${deviceId}.responseCode`, { val: -99, ack: true });
                        }

                        reject('http error');
                    });
            } else {
                reject('unknown sensor type');
            }
        });
    }

    removeNamespace(id) {
        const re = new RegExp(this.namespace + '*\\.', 'g');
        return id.replace(re, '');
    }

    /**
     * @param {() => void} callback
     */
    onUnload(callback) {
        try {
            this.log.debug('cleaned everything up...');
            callback();
        } catch {
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
