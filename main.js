/* jshint -W097 */
/* jshint strict: false */
/* jslint node: true */
'use strict';

var utils = require('@iobroker/adapter-core');
var request = require('request');

let adapter;

function startAdapter(options) {
    options = options || {};
    Object.assign(options, {
        name: 'luftdaten',
        ready: () => main()
    });

    adapter = new utils.Adapter(options);

    return adapter;
};

function main() {

    var sensorType = adapter.config.sensorType;
    var sensorIdentifier = adapter.config.sensorIdentifier;
    let sensorName = (adapter.config.sensorName === "") ? sensorIdentifier : adapter.config.sensorName;
    let path = (sensorType == 'local') ? sensorIdentifier.replace(/\./g, '_') + '.' : sensorIdentifier + '.';

    adapter.log.debug('sensor type: ' + sensorType);
    adapter.log.debug('sensor identifier: ' + sensorIdentifier);
    adapter.log.debug('sensor name: ' + sensorName);

    adapter.setObjectNotExists(path + 'name', {
        type: 'state',
            common: {
                name: 'name',
                type: 'string',
                role: 'text'
            },
        native: {}
    });

    adapter.setState(path + 'name', {val: sensorName, ack: true});

    if (sensorType == 'local') {
        adapter.log.debug('local request');

        request(
            {
                url: 'http://' + sensorIdentifier + '/data.json',
                json: true
            },
            function (error, response, content) {
                adapter.log.debug('Request done');

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

                            adapter.setObjectNotExists(path + obj.value_type, {
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
                            adapter.setState(path + obj.value_type, {val: obj.value, ack: true});
                        }
                    } else {
                        adapter.log.warn('Response has no valid content. Check hostname/IP address and try again.');
                    }

                } else {
                    adapter.log.error(error);
                }
            }
        );
    } else if (sensorType == 'remote') {
        adapter.log.debug('remote request');

        request(
            {
                url: 'http://api.luftdaten.info/v1/sensor/' + sensorIdentifier + '/',
                json: true
            },
            function (error, response, content) {
                adapter.log.debug('Request done');

                if (!error && response.statusCode == 200) {

                    if (content && Array.isArray(content)) {
                        var sensorData = content[0];

                        for (var key in sensorData.sensordatavalues) {
                            var obj = sensorData.sensordatavalues[key];

                            adapter.setObjectNotExists(path + 'SDS_' + obj.value_type, {
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
                            adapter.setState(path + 'SDS_' + obj.value_type, {val: obj.value, ack: true});
                        }

                        if (sensorData.hasOwnProperty('location')) {

                            adapter.setObjectNotExists(path + 'location', {
                                type: 'channel',
                                common: {
                                    name: 'Location',
                                    role: 'value.gps'
                                },
                                native: {}
                            });

                            adapter.setObjectNotExists(path + 'location.longitude', {
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
                            adapter.setState(path + 'location.longitude', {val: sensorData.location.longitude, ack: true});

                            adapter.setObjectNotExists(path + 'location.latitude', {
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
                            adapter.setState(path + 'location.latitude', {val: sensorData.location.latitude, ack: true});

                            adapter.setObjectNotExists(path + 'location.altitude', {
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
                            adapter.setState(path + 'location.altitude', {val: sensorData.location.altitude, ack: true});
                        }
                    } else {
                        adapter.log.warn('Response has no valid content. Check sensor id and try again.');
                    }
                } else {
                    adapter.log.error(error);
                }
            }
        );
    }

    setTimeout(function () {
        adapter.stop();
    }, 10000);
}

// If started as allInOne/compact mode => return function to create instance
if (module && module.parent) {
    module.exports = startAdapter;
} else {
    startAdapter();
}