#include <Wire.h>
#include "MAX30105.h"
#include "spo2_algorithm.h"

#include <OneWire.h>
#include <DallasTemperature.h>

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// BLE UUIDs
#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

BLEServer* pServer = NULL;
BLECharacteristic* pCharacteristic = NULL;
bool deviceConnected = false;
bool oldDeviceConnected = false;

// DS18B20
#define ONE_WIRE_BUS 4
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature tempSensor(&oneWire);

// MAX30102
MAX30105 particleSensor;

// Buffers
uint32_t irBuffer[100];
uint32_t redBuffer[100];

int32_t spo2;
int8_t validSPO2;

int32_t heartRate;
int8_t validHeartRate;

// Last good values
int lastHR = 0;
int lastSpO2 = 0;

class MyServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
      deviceConnected = true;
    };

    void onDisconnect(BLEServer* pServer) {
      deviceConnected = false;
    }
};

void setup()
{
  Serial.begin(115200);

  tempSensor.begin();

  Wire.begin(21, 22);

  if (!particleSensor.begin(Wire, I2C_SPEED_FAST))
  {
    Serial.println("{\"error\":\"MAX30102 not found\"}");
    while (1);
  }

  particleSensor.setup(
    20,    // LED brightness
    4,     // sample average
    2,     // Red + IR
    100,   // sample rate
    411,   // pulse width
    4096   // ADC range
  );

  // Initialize BLE
  BLEDevice::init("NephroCare Wearable");
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  BLEService *pService = pServer->createService(SERVICE_UUID);

  pCharacteristic = pService->createCharacteristic(
                      CHARACTERISTIC_UUID,
                      BLECharacteristic::PROPERTY_READ |
                      BLECharacteristic::PROPERTY_NOTIFY
                    );

  pCharacteristic->addDescriptor(new BLE2902());

  pService->start();

  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);  // helps with iOS connection issues
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();
  Serial.println("BLE Advertising started!");
}

void sendBLEMessage(String msg) {
  if (!deviceConnected) return;
  int len = msg.length();
  int chunk_size = 20;
  for (int i = 0; i < len; i += chunk_size) {
    int endIdx = i + chunk_size;
    if (endIdx > len) endIdx = len;
    String chunk = msg.substring(i, endIdx);
    pCharacteristic->setValue(chunk.c_str());
    pCharacteristic->notify();
    delay(20); // Small delay to prevent buffer overflow in BLE stack
  }
}

void loop()
{
  // Connection handling
  if (!deviceConnected && oldDeviceConnected) {
      delay(500); // give the bluetooth stack the chance to get ready
      pServer->startAdvertising(); // restart advertising
      Serial.println("Restart advertising...");
      oldDeviceConnected = deviceConnected;
  }
  if (deviceConnected && !oldDeviceConnected) {
      // do stuff on connection
      oldDeviceConnected = deviceConnected;
      Serial.println("Device connected!");
  }

  // Collect samples
  for (int i = 0; i < 100; i++)
  {
    while (!particleSensor.available())
      particleSensor.check();

    redBuffer[i] = particleSensor.getRed();
    irBuffer[i] = particleSensor.getIR();

    particleSensor.nextSample();
  }

  long currentIR = irBuffer[99];

  // Temperature
  tempSensor.requestTemperatures();
  float tempC = tempSensor.getTempCByIndex(0);

  bool fingerDetected = currentIR > 50000;

  if (fingerDetected)
  {
    maxim_heart_rate_and_oxygen_saturation(
      irBuffer,
      100,
      redBuffer,
      &spo2,
      &validSPO2,
      &heartRate,
      &validHeartRate
    );

    // Accept only realistic values
    if (validHeartRate && heartRate >= 40 && heartRate <= 180)
      lastHR = heartRate;

    if (validSPO2 && spo2 >= 80 && spo2 <= 100)
      lastSpO2 = spo2;
  }

  // Create JSON string
  String jsonStr = "{";
  jsonStr += "\"temperature\":" + String(tempC, 1);
  jsonStr += ",\"heartRate\":";
  if (lastHR > 0)
    jsonStr += String(lastHR);
  else
    jsonStr += "null";
  jsonStr += ",\"spo2\":";
  if (lastSpO2 > 0)
    jsonStr += String(lastSpO2);
  else
    jsonStr += "null";
  jsonStr += ",\"fingerDetected\":" + String(fingerDetected ? "true" : "false");
  jsonStr += ",\"ir\":" + String(currentIR);
  jsonStr += "}";

  // JSON output for Serial
  Serial.println(jsonStr);

  // Send via BLE if connected (appends a newline so client can buffer and split chunks)
  if (deviceConnected) {
    sendBLEMessage(jsonStr + "\n");
  }

  delay(1000);
}
