/* jshint -W097 */
/* jshint strict: false */
/* jslint node: true */
'use strict';

const utils = require('@iobroker/adapter-core');
const request = require('request');

class Luftdaten extends utils.Adapter {

    constructor(options) {
        super({
            ...options,
            name: 'luftdaten',
        });
        this.on('ready', this.onReady.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    async onReady() {
        const self = this;

        const sensorType = this.config.sensorType;
        const sensorIdentifier = this.config.sensorIdentifier;
        const sensorName = (this.config.sensorName === '') ? sensorIdentifier : this.config.sensorName;

        if (sensorIdentifier && sensorName) {
            const path = (sensorType == 'local') ? sensorIdentifier.replace(/\./g, '_') + '.' : sensorIdentifier + '.';

            const unitList = {
                P1: 'µg/m³',
                P2: 'µg/m³',
                temperature: '°C',
                humidity: '%',
                signal: 'dBa',
                min_micro: 'µs',
                max_micro: 'µs'
            };

            const roleList = {
                P1: 'value.ppm',
                P2: 'value.ppm',
                temperature: 'value.temperature',
                humidity: 'value.humidity',
                signal: 'value',
                min_micro: 'value',
                max_micro: 'value'
            };

            this.log.debug('sensor type: ' + sensorType + ', sensor identifier: ' + sensorIdentifier + ', sensor name: ' + sensorName);

            this.setObjectNotExists(path + 'name', {
                type: 'state',
                common: {
                    name: 'name',
                    type: 'string',
                    role: 'text'
                },
                native: {}
            });

            this.setState(path + 'name', {val: sensorName, ack: true});

            if (sensorType == 'local') {
                this.log.debug('local request started');

                request(
                    {
                        url: 'http://' + sensorIdentifier + '/data.json',
                        json: true,
                        time: true,
                        timeout: 4500
                    },
                    (error, response, content) => {
                        self.log.debug('local request done');

                        if (response) {
                            self.log.debug('received data (' + response.statusCode + '): ' + JSON.stringify(content));

                            self.setObjectNotExists(path + 'responseCode', {
                                type: 'state',
                                common: {
                                    name: 'responseCode',
                                    type: 'number',
                                    role: 'value',
                                    read: true,
                                    write: false
                                },
                                native: {}
                            });
                            self.setState(path + 'responseCode', {val: response.statusCode, ack: true});

                            self.setObjectNotExists(path + 'responseTime', {
                                type: 'state',
                                common: {
                                    name: 'responseTime',
                                    type: 'number',
                                    role: 'value',
                                    unit: 'ms',
                                    read: true,
                                    write: false
                                },
                                native: {}
                            });
                            self.setState(path + 'responseTime', {val: parseInt(response.timingPhases.total), ack: true});

                            if (!error && response.statusCode == 200) {
                                if (content && Object.prototype.hasOwnProperty.call(content, 'sensordatavalues')) {
                                    for (const key in content.sensordatavalues) {
                                        const obj = content.sensordatavalues[key];

                                        let unit = null;
                                        let role = 'value';

                                        if (obj.value_type.indexOf('SDS_') == 0) {
                                            unit = 'µg/m³';
                                            role = 'value.ppm';
                                        } else if (Object.prototype.hasOwnProperty.call(unitList, obj.value_type)) {
                                            unit = unitList[obj.value_type];
                                            role = roleList[obj.value_type];
                                        }

                                        self.setObjectNotExists(path + obj.value_type, {
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
                                        self.setState(path + obj.value_type, {val: parseFloat(obj.value), ack: true});
                                    }
                                } else {
                                    self.log.warn('Response has no valid content. Check hostname/IP address and try again.');
                                }
                            }
                        } else if (error) {
                            self.log.warn(error);
                        }
                    }
                );
            } else if (sensorType == 'remote') {
                this.log.debug('remote request started');

                request(
                    {
                        url: 'https://data.sensor.community/airrohr/v1/sensor/' + sensorIdentifier + '/',
                        json: true,
                        time: true,
                        timeout: 4500
                    },
                    (error, response, content) => {
                        self.log.debug('remote request done');

                        if (response) {
                            self.log.debug('received data (' + response.statusCode + '): ' + JSON.stringify(content));

                            self.setObjectNotExists(path + 'responseCode', {
                                type: 'state',
                                common: {
                                    name: 'responseCode',
                                    type: 'number',
                                    role: 'value',
                                    read: true,
                                    write: false
                                },
                                native: {}
                            });
                            self.setState(path + 'responseCode', {val: response.statusCode, ack: true});

                            self.setObjectNotExists(path + 'responseTime', {
                                type: 'state',
                                common: {
                                    name: 'responseTime',
                                    type: 'number',
                                    role: 'value',
                                    unit: 'ms',
                                    read: true,
                                    write: false
                                },
                                native: {}
                            });
                            self.setState(path + 'responseTime', {val: parseInt(response.timingPhases.total), ack: true});

                            if (!error && response.statusCode == 200) {
                                if (content && Array.isArray(content)) {
                                    const sensorData = content[0];

                                    if (Object.prototype.hasOwnProperty.call(content, 'sensordatavalues')) {
                                        for (const key in sensorData.sensordatavalues) {
                                            const obj = sensorData.sensordatavalues[key];

                                            let unit = null;
                                            let role = 'value';

                                            if (Object.prototype.hasOwnProperty.call(unitList, obj.value_type)) {
                                                unit = unitList[obj.value_type];
                                                role = roleList[obj.value_type];
                                            }

                                            self.setObjectNotExists(path + 'SDS_' + obj.value_type, {
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
                                            self.setState(path + 'SDS_' + obj.value_type, {val: parseFloat(obj.value), ack: true});
                                        }
                                    } else {
                                        self.log.warn('Response has no valid content. Check hostname/IP address and try again.');
                                    }

                                    if (Object.prototype.hasOwnProperty.call(sensorData, 'location')) {
        
                                        self.setObjectNotExists(path + 'location', {
                                            type: 'channel',
                                            common: {
                                                name: 'Location',
                                                role: 'value.gps'
                                            },
                                            native: {}
                                        });

                                        self.setObjectNotExists(path + 'location.longitude', {
                                            type: 'state',
                                            common: {
                                                name: 'Longtitude',
                                                type: 'number',
                                                role: 'value.gps.longitude',
                                                unit: '°',
                                                read: true,
                                                write: false
                                            },
                                            native: {}
                                        });
                                        self.setState(path + 'location.longitude', {val: sensorData.location.longitude, ack: true});

                                        self.setObjectNotExists(path + 'location.latitude', {
                                            type: 'state',
                                            common: {
                                                name: 'Latitude',
                                                type: 'number',
                                                role: 'value.gps.latitude',
                                                unit: '°',
                                                read: true,
                                                write: false
                                            },
                                            native: {}
                                        });
                                        self.setState(path + 'location.latitude', {val: sensorData.location.latitude, ack: true});

                                        self.setObjectNotExists(path + 'location.altitude', {
                                            type: 'state',
                                            common: {
                                                name: 'Altitude',
                                                type: 'number',
                                                role: 'value.gps.elevation',
                                                unit: 'm',
                                                read: true,
                                                write: false
                                            },
                                            native: {}
                                        });
                                        self.setState(path + 'location.altitude', {val: sensorData.location.altitude, ack: true});

                                        self.setObjectNotExists(path + 'timestamp', {
                                            type: 'state',
                                            common: {
                                                name: 'Last Update',
                                                type: 'string',
                                                role: 'date',
                                                read: true,
                                                write: false
                                            },
                                            native: {}
                                        });
                                        self.setState(path + 'timestamp', {val: sensorData.timestamp, ack: true});
                                    }
                                } else {
                                    self.log.warn('Response has no valid content. Check sensor id and try again.');
                                }
                            }
                        } else if (error) {
                            self.log.warn(error);
                        }
                    }
                );
            }
        } else {
            this.log.debug('sensor type and/or sensor identifier not defined');
        }

        setTimeout(this.stop.bind(this), 10000);
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
