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
    var sensorName = (adapter.config.sensorName === "") ? sensorIdentifier : adapter.config.sensorName;
    var path = (sensorType == "local") ? sensorIdentifier.replace(/\./g,"_") + "." : sensorIdentifier + ".";
    adapter.log.debug('sensor type: ' + sensorType);
    adapter.log.debug('sensor identifier: ' + sensorIdentifier);
    adapter.log.debug('sensor name: ' + sensorName);
    adapter.setObjectNotExists(path + 'Name', {
        type: 'state',
            common: {
                name: 'Name',
                type: 'string',
                role: 'text'
            },
        native: {}
    });
    adapter.setState(path + 'Name', {val: sensorName, ack: true});
    if (sensorType == "local") {
        adapter.log.debug('local request');
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

                        adapter.setObjectNotExists(path + obj.value_type, {
                            type: 'state',
                            common: {
                                name: obj.value_type,
                                type: 'number',
                                role: 'value'
                            },
                            native: {}
                        });

                        adapter.setState(path + obj.value_type, {val: obj.value, ack: true});
                    }

                } else {
                    adapter.log.error(error);
                }
            }
        );
    } else if (sensorType == "remote") {
        adapter.log.debug('remote request');
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

                        adapter.setObjectNotExists(path + 'SDS_' + obj.value_type, {
                            type: 'state',
                            common: {
                                name: 'SDS_' + obj.value_type,
                                type: 'number',
                                role: 'value'
                            },
                            native: {}
                        });

                        adapter.setState(path + 'SDS_' + obj.value_type, {val: obj.value, ack: true});
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
