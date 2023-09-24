// References: 
// https://randomnerdtutorials.com/esp8266-nodemcu-http-get-post-arduino/
// https://randomnerdtutorials.com/decoding-and-encoding-json-with-arduino-or-esp8266/

int LEDpin = 2; // For fun
#include <DHT.h> // by Adafruit
#include <ArduinoJson.h> // Version 6
#include <ESP8266WiFi.h>        // Include the Wi-Fi library
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>

const char* ssid     = "<Your WiFi SSID>";         // The SSID (name) of the Wi-Fi network you want to connect to
const char* password = "<Your WiFi Password>";     // The password of the Wi-Fi network
String API = "https://<Your Server>/api/upload/<Site Name>/<Sensor Name>"; // Host of your NodeIoT platform
String TOKEN = "<Your Server Token>";

#define DHTdataPin D2 // Defines pin number to which the sensor is connected
#define DHTtype DHT22
DHT MyDHT22(DHTdataPin, DHTtype);

inline void tryToConnect() {
  WiFi.begin(ssid, password);             // Connect to the network
  Serial.print("Connecting to ");
  Serial.print(ssid); Serial.println(" ...");
  int i = 0;
  while (WiFi.status() != WL_CONNECTED) { // Wait for the Wi-Fi to connect
    delay(1000);
    Serial.print(++i); Serial.print(' ');
  }

  Serial.println('\n');
  Serial.println("Connection established!");  
  Serial.print("IP address:\t");
  Serial.println(WiFi.localIP());         // Send the IP address of the ESP8266 to the computer
}
void setup() {
  // initialize GPIO 2 as an output.
  pinMode(LEDpin, OUTPUT);
  Serial.begin(115200);         // Start the Serial communication to send messages to the computer
  delay(10);
  Serial.println('\n');
    
  tryToConnect();
  delay(500);
  MyDHT22.begin();
  delay(500);
  
  Serial.println("Init finished\n");
}
void uploadJSON(String httpRequestData) {
    Serial.print("Sent: ");
    Serial.println(httpRequestData);
    WiFiClient client;
    HTTPClient http;
    String serverPath = API + "?token=" + TOKEN;
    // Your Domain name with URL path or IP address with path
    http.begin(client, serverPath.c_str());
    http.addHeader("Content-Type", "application/json");
    
    // If you need Node-RED/server authentication, insert user and password below
    //http.setAuthorization("REPLACE_WITH_SERVER_USERNAME", "REPLACE_WITH_SERVER_PASSWORD");
      
    // Send HTTP GET request
    int httpResponseCode = http.POST(httpRequestData.c_str());
    
    if (httpResponseCode>0) {
      Serial.print("Received: ");
      Serial.println(httpResponseCode);
      String payload = http.getString();
      Serial.println(payload);
    }
    else {
      Serial.print("Error code: ");
      Serial.println(httpResponseCode);
    }
    // Free resources
    http.end();
}
// the loop function runs over and over again forever
int sensor_cnt = 0;
double total_t=0;
double total_h=0;
void loop() {
  if (WiFi.status() != WL_CONNECTED) { // Wait for the Wi-Fi to connect
    tryToConnect();
  }
  
  int readData = MyDHT22.read(DHTdataPin);
  double t = MyDHT22.readTemperature(); // Gets the values of the temperature
  double h = MyDHT22.readHumidity(); // Gets the values of the humidity
  sensor_cnt++;
  total_t+=t;
  total_h+=h;

  Serial.print(sensor_cnt);Serial.print("   ");
  Serial.print(t);Serial.print("   ");
  Serial.println(h);
    
  if (sensor_cnt >= 15) {
    DynamicJsonDocument doc(1024);
    doc["temperature"] = total_t / sensor_cnt;
    doc["humidity"] = total_h / sensor_cnt;
    String json_data;
    serializeJson(doc, json_data);
    uploadJSON(json_data);
    sensor_cnt=0;
    total_t=0;
    total_h=0;
  }
  
  digitalWrite(LEDpin, HIGH);   // turn the LED on (HIGH is the voltage level)
  delay(1000);               // wait for a second
  digitalWrite(LEDpin, LOW);    // turn the LED off by making the voltage LOW
  delay(1000);               // wait for a second
}