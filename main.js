/* jshint -W097 */
/* jshint strict: false */
/* jslint node: true */
'use strict';

var utils = require('@iobroker/adapter-core');
var request = require('request');

class Luftdaten extends utils.Adapter {

    constructor(options) {
        super({
            ...options,
            name: 'luftdaten',
        });
        this.on('ready', this.onReady.bind(this));
    }

    async onReady() {
        var self = this;
        var sensorType = this.config.sensorType;
        var sensorIdentifier = this.config.sensorIdentifier;
        let sensorName = (this.config.sensorName === "") ? sensorIdentifier : this.config.sensorName;
        let path = (sensorType == 'local') ? sensorIdentifier.replace(/\./g, '_') + '.' : sensorIdentifier + '.';

        this.log.debug('sensor type: ' + sensorType);
        this.log.debug('sensor identifier: ' + sensorIdentifier);
        this.log.debug('sensor name: ' + sensorName);

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
            this.log.debug('local request');

            request(
                {
                    url: 'http://' + sensorIdentifier + '/data.json',
                    json: true
                },
                function (error, response, content) {
                    self.log.debug('local request done');

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

                    if (!error && response.statusCode == 200) {

                        if (content && content.hasOwnProperty('sensordatavalues')) {

                            var unitList = {
                                temperature: '°C',
                                humidity: '%',
                                signal: 'dBa',
                                min_micro: 'µs',
                                max_micro: 'µs'
                            };

                            var roleList = {
                                temperature: 'value.temperature',
                                humidity: 'value.humidity',
                                signal: 'value',
                                min_micro: 'value',
                                max_micro: 'value'
                            };

                            for (var key in content.sensordatavalues) {
                                var obj = content.sensordatavalues[key];
                                var unit = null;
                                var role = 'value';

                                if (obj.value_type.indexOf("SDS") == 0) {
                                    unit = 'µg/m³';
                                    role = 'value.ppm';
                                } else if (unitList.hasOwnProperty(obj.value_type)) {
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
                                self.setState(path + obj.value_type, {val: obj.value, ack: true});
                            }
                        } else {
                            self.log.warn('Response has no valid content. Check hostname/IP address and try again.');
                        }
    
                    } else {
                        self.log.warn(error);
                    }
                }
            );
        } else if (sensorType == 'remote') {
            this.log.debug('remote request');

            request(
                {
                    url: 'http://api.luftdaten.info/v1/sensor/' + sensorIdentifier + '/',
                    json: true
                },
                function (error, response, content) {
                    self.log.debug('remote request done');

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

                    if (!error && response.statusCode == 200) {

                        if (content && Array.isArray(content)) {
                            var sensorData = content[0];

                            for (var key in sensorData.sensordatavalues) {
                                var obj = sensorData.sensordatavalues[key];

                                self.setObjectNotExists(path + 'SDS_' + obj.value_type, {
                                    type: 'state',
                                    common: {
                                        name: 'SDS_' + obj.value_type,
                                        type: 'number',
                                        role: 'value.ppm',
                                        unit: 'µg/m³',
                                        read: true,
                                        write: false
                                    },
                                    native: {}
                                });
                                self.setState(path + 'SDS_' + obj.value_type, {val: obj.value, ack: true});
                            }

                            if (sensorData.hasOwnProperty('location')) {

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
                            }
                        } else {
                            self.log.warn('Response has no valid content. Check sensor id and try again.');
                        }
                    } else {
                        self.log.warn(error);
                    }
                }
            );
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