#include <Wire.h>
#include "MAX30105.h"
#include "spo2_algorithm.h"

#include <OneWire.h>
#include <DallasTemperature.h>

#include "BluetoothSerial.h"

// Bluetooth
BluetoothSerial SerialBT;

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

void setup()
{
  Serial.begin(115200);

  // Bluetooth Device Name
  SerialBT.begin("NephroCarePatch");

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

  Serial.println("System Started");
  SerialBT.println("System Started");
}

void loop()
{
  // Collect 100 samples
  for (int i = 0; i < 100; i++)
  {
    while (!particleSensor.available())
      particleSensor.check();

    redBuffer[i] = particleSensor.getRed();
    irBuffer[i] = particleSensor.getIR();

    particleSensor.nextSample();
  }

  long currentIR = irBuffer[99];

  // Read Temperature
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

    // Store only valid values
    if (validHeartRate && heartRate >= 40 && heartRate <= 180)
      lastHR = heartRate > 100 ? 100 : heartRate;

    if (validSPO2 && spo2 >= 80 && spo2 <= 100)
      lastSpO2 = spo2;
  }

  // Create JSON
  String json = "{";

  json += "\"temperature\":";
  json += String(tempC, 1);

  json += ",\"heartRate\":";
  if (lastHR > 0)
    json += String(lastHR);
  else
    json += "null";

  json += ",\"spo2\":";
  if (lastSpO2 > 0)
    json += String(lastSpO2);
  else
    json += "null";

  json += ",\"fingerDetected\":";
  json += (fingerDetected ? "true" : "false");

  json += ",\"ir\":";
  json += String(currentIR);

  json += "}";

  // USB Serial Output
  Serial.println(json);

  // Bluetooth Output
  SerialBT.println(json);

  delay(1000);
}
