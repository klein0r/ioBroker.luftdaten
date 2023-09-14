![Logo](admin/luftdaten.png)

# ioBroker.luftdaten

[![NPM version](https://img.shields.io/npm/v/iobroker.luftdaten?style=flat-square)](https://www.npmjs.com/package/iobroker.luftdaten)
[![Downloads](https://img.shields.io/npm/dm/iobroker.luftdaten?label=npm%20downloads&style=flat-square)](https://www.npmjs.com/package/iobroker.luftdaten)
![node-lts](https://img.shields.io/node/v-lts/iobroker.luftdaten?style=flat-square)
![Libraries.io dependency status for latest release](https://img.shields.io/librariesio/release/npm/iobroker.luftdaten?label=npm%20dependencies&style=flat-square)

![GitHub](https://img.shields.io/github/license/klein0r/iobroker.luftdaten?style=flat-square)
![GitHub repo size](https://img.shields.io/github/repo-size/klein0r/iobroker.luftdaten?logo=github&style=flat-square)
![GitHub commit activity](https://img.shields.io/github/commit-activity/m/klein0r/iobroker.luftdaten?logo=github&style=flat-square)
![GitHub last commit](https://img.shields.io/github/last-commit/klein0r/iobroker.luftdaten?logo=github&style=flat-square)
![GitHub issues](https://img.shields.io/github/issues/klein0r/iobroker.luftdaten?logo=github&style=flat-square)
![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/klein0r/iobroker.luftdaten/test-and-release.yml?branch=master&logo=github&style=flat-square)

## Versions

![Beta](https://img.shields.io/npm/v/iobroker.luftdaten.svg?color=red&label=beta)
![Stable](http://iobroker.live/badges/luftdaten-stable.svg)
![Installed](http://iobroker.live/badges/luftdaten-installed.svg)

This adapter adds "luftdaten.info" sensor data to your ioBroker installation.
You can decide if you want to add a local sensor by ip or if you just want to use the API of lufdaten.info to get the data of another sensor.

## Sponsored by

[![ioBroker Master Kurs](https://haus-automatisierung.com/images/ads/ioBroker-Kurs.png)](https://haus-automatisierung.com/iobroker-kurs/?refid=iobroker-luftdaten)

## Installation

Please use the "adapter list" in ioBroker to install a stable version of this adapter. You can also use the CLI to install this adapter:

```
iobroker add luftdaten
```

## Documentation

[🇺🇸 Documentation](./docs/en/README.md)

[🇩🇪 Dokumentation](./docs/de/README.md)

## Sentry

**This adapter uses Sentry libraries to automatically report exceptions and code errors to the developers.** For more details and for information how to disable the error reporting see [Sentry-Plugin Documentation](https://github.com/ioBroker/plugin-sentry#plugin-sentry)! Sentry reporting is used starting with js-controller 3.0.

## Changelog

<!--
  Placeholder for the next version (at the beginning of the line):
  ### **WORK IN PROGRESS**
-->
### **WORK IN PROGRESS**

* (klein0r) Added link to sensor map to intro tab

### 3.0.0 (2023-05-01)

NodeJS 14.x is required (NodeJS 12.x is EOL)

* (klein0r) Added link to sensor map to instance configuration
* (klein0r) Updated dependencies
* (klein0r) Updated depedency for js-controller to 4.0.15
* (klein0r) Dropped Admin 5 support
* (klein0r) Added Ukrainian language

### 2.2.4 (2022-04-14)

* (klein0r) Abort HTTP requests if running too long

### 2.2.3 (2022-04-11)

* (klein0r) Always stop instance when tasks are completed
* (klein0r) Updated log messages

### 2.2.2 (2022-03-14)

* (klein0r) Bugfix: Requested local sensors with https instead of http

### 2.2.1 (2022-03-14)

* (klein0r) Do not delete sensors on http problems

## License

The MIT License (MIT)

Copyright (c) 2023 Matthias Kleine <info@haus-automatisierung.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
