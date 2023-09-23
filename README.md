# Simple Toy IoT Platform
## Introduction
A simple IoT platform.  
Main goals:  
+ Collect data received from sensors, tracking environment states of a lab/site
+ Publish the correct state of a device(sensor) via API (where the device polls) to control it 

## Installation
- Server(Host)  
  1. `npm ci`  
  2. `node server.js`  

- Client(Hardware)  
  1. Connect to the server (Ethernet cables / WiFi modules)  
  2. Sent data by HTTP! (Maybe WebSocket in the future?)  


## Usage

### Hardware Client
You need to 

### Authentication  
You should authenticate yourself by a token to access the API.  
`?token=<token>` or pass it via HTTP header:  
`X-Upload-Token: <token>`  

### Configuration
A configuration file with extension name `.json` is under `config` folder; otherwise, it is under the root folder.  
#### Environment Variables Override
You can override environment variables in runtime by setting key-value pairs in `ENV.json`. 

#### Constants
Constants and paths can be found in `constants.js`.  
**Paths mentioned in thid documentation are default values in `constants.js`. Ofcourse, you can change them, so the paths may vary in your environment.**  

#### Sites Definition
Edit `sensor_sites.json` to define custom columns of each sensor (depending on their hardware functionalities).  
Note: A "site" is a group of sensors. 

#### Recorded Data
Data is saved in the `data.sqlite` file by SQLite. So Remember to keep it safe!  

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

Common path prefix: `/api`, will be included in the paths provided below.  
**Note: Data Format**
We'll mention some timely used data formats here.   
+ `Result`
  ```json
  {
      "ok" : true, // Boolean value, operation successful or not
      "msg": "", // Any value, optional message
  }
  ```

### Rate Limits

Followed limits are applied to the API. You can modify the corresponding middleware in `server.js` to custom them.
+ 10 reqs/min
+ 5 reqs/3secs

### Define/Update a Site Structure
TODO

### Add/Update Sensor Data
`POST` `/api/upload/<Site Name>/<Sensor Name>`  
- Parameters
  None (POST body only)  

- Return 
  `Result` (where message is the affected record ID)

- Usage  
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


### Query Sensor Data
`GET` `/api/query/<Site Name>/<Sensor Name>?...`
TODO  
- Parameters
  - `recent` (Optional): Only return latest records, total=`recent` rows TODO

- Return
  `Result` (where message is the record data)
- Usage
    
### Publish Sensore State (TODO)
`GET` `/api/publish/<Site Name>/<Sensor Name>?...`
- Return
  `Result`
### Fetch(Polling) Sensore State (TODO)
`GET` `/api/poll/<Site Name>/<Sensor Name>?...`
- Return
  `Result` (where message is the current state)

### Modify Sensor Data
Not supported.  

### Delete Sensor Data
Not supported.  