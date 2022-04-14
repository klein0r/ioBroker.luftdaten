![Logo](admin/luftdaten.png)

# ioBroker.luftdaten

[![NPM version](http://img.shields.io/npm/v/iobroker.luftdaten.svg)](https://www.npmjs.com/package/iobroker.luftdaten)
[![Downloads](https://img.shields.io/npm/dm/iobroker.luftdaten.svg)](https://www.npmjs.com/package/iobroker.luftdaten)
[![Stable](http://iobroker.live/badges/luftdaten-stable.svg)](http://iobroker.live/badges/luftdaten-stable.svg)
[![installed](http://iobroker.live/badges/luftdaten-installed.svg)](http://iobroker.live/badges/luftdaten-installed.svg)
[![Dependency Status](https://img.shields.io/david/klein0r/iobroker.luftdaten.svg)](https://david-dm.org/klein0r/iobroker.luftdaten)
[![Known Vulnerabilities](https://snyk.io/test/github/klein0r/ioBroker.luftdaten/badge.svg)](https://snyk.io/test/github/klein0r/ioBroker.luftdaten)
![Test and Release](https://github.com/klein0r/ioBroker.luftdaten/workflows/Test%20and%20Release/badge.svg)

[![NPM](https://nodei.co/npm/iobroker.luftdaten.png?downloads=true)](https://nodei.co/npm/iobroker.luftdaten/)

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

[🇺🇸 Documentation](./docs/en/basics.md)

[🇩🇪 Dokumentation](./docs/de/basics.md)

## Sentry

**This adapter uses Sentry libraries to automatically report exceptions and code errors to the developers.** For more details and for information how to disable the error reporting see [Sentry-Plugin Documentation](https://github.com/ioBroker/plugin-sentry#plugin-sentry)! Sentry reporting is used starting with js-controller 3.0.

## Changelog

<!--
  Placeholder for the next version (at the beginning of the line):
  ### **WORK IN PROGRESS**
-->
### 2.2.4 (2022-04-14)

* (klein0r) Abort HTTP requests if running too long

### 2.2.3 (2022-04-11)

* (klein0r) Always stop instance when tasks are completed
* (klein0r) Updated log messages

### 2.2.2 (2022-03-14)

* (klein0r) Bugfix: Requested local sensors with https instead of http

### 2.2.1 (2022-03-14)

* (klein0r) Do not delete sensors on http problems

### 2.2.0 (2022-03-14)

* (klein0r) Added documentation
* (klein0r) Added hint for Admin 4 configuration
* (klein0r) Updated state roles
* (klein0r) Updated debug messages to provide more information
* (klein0r) Updated dependencies

## License

The MIT License (MIT)

Copyright (c) 2022 Matthias Kleine <info@haus-automatisierung.com>

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
