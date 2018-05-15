/* jshint -W097 */// jshint strict:false
/*jslint node: true */
'use strict';

var utils = require(__dirname + '/lib/utils'); // Get common adapter utils
var request = require('request');

var adapter = new utils.Adapter('luftdaten');

adapter.on('ready', function () {
    main();
});

function main() {

    var sensorType = adapter.config.sensorType;
    var sensorIdentifier = adapter.config.sensorIdentifier;

    adapter.log.info('sensor type: ' + sensorType);
    adapter.log.info('sensor identifier: ' + sensorIdentifier);

    if (sensorType == "local") {
        adapter.log.info('local request');

        request(
            {
                url: "http://" + sensorIdentifier + "/data.json",
                json: true
            },
            function (error, response, content) {
                adapter.log.debug('Request done');

                if (!error && response.statusCode == 200) {

                    for (var key in content.sensordatavalues) {
                        var obj = content.sensordatavalues[key];

                        adapter.setObjectNotExists(obj.value_type, {
                            type: 'state',
                            common: {
                                name: obj.value_type,
                                type: 'number',
                                role: 'value'
                            },
                            native: {}
                        });

                        adapter.setState(obj.value_type, {val: obj.value, ack: true});
                    }

                } else {
                    adapter.log.error(error);
                }
            }
        );
    } else if (sensorType == "remote") {
        adapter.log.info('remote request');

        request(
            {
                url: "http://api.luftdaten.info/v1/sensor/" + sensorIdentifier + "/",
                json: true
            },
            function (error, response, content) {
                adapter.log.debug('Request done');

                if (!error && response.statusCode == 200) {

                    for (var key in content[0].sensordatavalues) {
                        var obj = content[0].sensordatavalues[key];

                        adapter.setObjectNotExists('SDS_' + obj.value_type, {
                            type: 'state',
                            common: {
                                name: 'SDS_' + obj.value_type,
                                type: 'number',
                                role: 'value'
                            },
                            native: {}
                        });

                        adapter.setState('SDS_' + obj.value_type, {val: obj.value, ack: true});
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