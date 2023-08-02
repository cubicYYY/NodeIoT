# Simple Toy IoT Platform

## Introduction

## Configuration & Usage

## Installation

### Authentication  
You should authenticate yourself by a token to access the API.  
`?token=<token>` or set it in HTTP header:  
`X-Upload-Token: <token>`  

### Configuration
Constants and paths can be found in `constant.js`.

#### Sites Structure Definitions
In `./configs/sensor_sites.json` by default.  
Example:  
```json
{
  "AAA108": {
    "desc": "AAA Base, NodeMCU + ESP8266 + DHT22 + [light sensor]",
    "sensors": {
      "DHT22": {
        "desc": "2 digits precision",
        "schema": {
          "temperature": "REAL",
          "humidity": "REAL"
        }
      },
      "light": {
        "desc": "light sensor",
        "schema": {
          "resistance": "REAL"
        }
      }
    }
  },
  "YYY": {
    "desc": "YYY's dormitory, @32-386",
    "sensors": {
      "DHT22": {
        "desc": "",
        "schema": {
          "temperature": "REAL",
          "humidity": "REAL"
        }
      }
    }
  }
}
```

## API

**Note: Data Format**
We'll mention some timely used data formats here.   
+ `Result`
    ```json
    {
        "ok" : true, // Boolean value, operation successful or not
        "msg": "", // Any value, optional message
    }
    ```

### Define/Update a Site Structure
TODO

### Add/Update Sensor Data
`POST` `/upload/<Site Name>/<Sensor Name>?...`  
- Usage:  
    Only accepts requests with HTTP header `Content-Type: application/json`, data is passed as a json in HTTP body.  
    You can specified the custom columns in the sites structure definition file mentioned above.  
    ```json
    {
        "id": 11, // Optional,
        // if provided -> overwrite old data
        // otherwise insert a new data record
        // ID is only unique between records of a specific sensor!

        "timestamp": 114514, // Optional, default by the server time
        // belows are customed columns
        "temperature": 25.5,
        "humidity": 88.5
    }
    ```

- Return format: 
    `Result` (where message is the affected record ID)

### Query Sensor Data
TODO

### Modify Sensor Data
TODO

### Delete Sensor Data
TODO
