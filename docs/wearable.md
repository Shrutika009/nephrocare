# NephroCare Wearable Patch - Hardware & AI Risk Engine Architecture

## 1. Why this hardware design exists

Conventional CKD monitoring relies on periodic, invasive blood tests (creatinine) and urine tests (albumin). The NephroCare wearable patch offers a non-invasive, continuous trend monitoring approach by tracking key physiological proxies (Heart Rate, SpO2, and skin temperature) at the skin surface.

Rather than claiming lab-equivalent biomarker quantification, the hardware is scoped to what a practical 2-sensor wearable patch can deliver: **physiological trend detection and stress proxy monitoring**.

---

## 2. System Block Diagram

```
┌────────────────────────────────────────────────────────────┐
│                     WEARABLE PATCH (on-body)                │
│                                                              │
│  MAX30102 (PPG Sensor)           DS18B20 (Temperature)      │
│       │                                │                    │
│       └────────────────┬───────────────┘                    │
│                        ▼                                    │
│                 ESP32 DevKit V1                             │
│       (Sampling, serialization, JSON packaging)             │
└────────────────────────┬───────────────────────────────────┘
                         │ USB Serial (Stream) / BLE
                         ▼
                 ┌───────────────┐
                 │  Mobile / Web │
                 │  Client App   │
                 └───────┬───────┘
                         │ Local HTTP API
                         ▼
             ┌───────────────────────┐
             │   Python API Server   │
             │   (AI Risk Engine)    │
             └───────────────────────┘
```

This mirrors the end-to-end framework: wearable physiological sensing → data transmission (USB Serial / BLE) → local API server & AI analytics → patient dashboard visualization.

---

## 3. Sensor Modules and Proxies

| Module | Part | Signal | What it really tells you |
|---|---|---|---|
| PPG Sensor | MAX30102 | Optical pulse waveform | Heart Rate (HR), HRV (Heart Rate Variability), and Blood Oxygen Saturation (SpO2) — sympathetic stress/hypoxia proxies |
| Skin Temperature | DS18B20 | Thermistor probe | Local skin temperature trends — vasodilation / stress proxy |

---

## 4. ESP32 Pin Map

| Sensor Pin | ESP32 GPIO | Bus | Function / Role |
|---|---|---|---|
| MAX30102 SDA | GPIO 21 | I2C | Optical PPG Data Line |
| MAX30102 SCL | GPIO 22 | I2C | Optical PPG Clock Line |
| DS18B20 DATA | GPIO 4 | 1-Wire (+4.7kΩ pull-up) | Temperature Data Line |
| Battery (Li-Po 3.7V) | VIN / 5V | Power | Input power supply |
| Common ground | GND | — | Common reference ground |

---

## 5. Data Acquisition & Transmission Pipeline

1. **Sample**: The ESP32 polls the DS18B20 temperature sensor and MAX30102 PPG sensor. It runs the SpO2 algorithm using 100-sample raw IR/Red light buffers.
2. **Condition**: Gated by a finger-detection threshold (IR light reading > 50,000) to ensure data is only recorded when worn.
3. **Package**: Sensor values are bundled into a clean JSON payload:
   ```json
   {
     "temperature": 30.5,
     "heartRate": 72,
     "spo2": 98,
     "fingerDetected": true,
     "ir": 61200
   }
   ```
4. **Transmit**: Outputted over USB Serial at 115200 baud and broadcasted via BLE notify.
5. **Ingest**: The local frontend/backend reads the telemetry stream to feed the AI Kidney Stress Index.

---

## 6. AI Risk Engine & Kidney Stress Index

The backend risk engine uses the real-time biometric stream to calculate the **Kidney Stress Index (0–100%)**:

* **HR/HRV Deviations**: Elevated resting heart rate serves as a cardiovascular workload indicator.
* **Skin Temperature Trends**: Extremity temperature fluctuations serve as a proxy for stress-induced vasoconstriction.
* **Biometric Fusion**:
  $$\text{Stress Index} = 0.60 \times (\text{HRV/HR Deviation}) + 0.40 \times (\text{Temp Deviation})$$

---

## 7. Known Hardware Limitations

* **Motion Artifacts**: PPG readings degrade with movement; mitigated by prompt finger-detection gating.
* **Thermal vasodilation**: Ambient room temperature changes affect skin temperature readings; mitigated by calculating relative baseline deviation instead of absolute values.

---

## 8. Bill of Materials (BOM)

| Component | Role | Required for MVP? |
|---|---|---|
| ESP32 DevKit V1 | Main MCU + Bluetooth + Serial | Yes |
| MAX30102 | PPG/HR/SpO2 | Yes |
| DS18B20 | Skin Temperature | Yes |
| 4.7kΩ resistor | Pull-up for DS18B20 1-Wire bus | Yes |
| Micro-USB Cable | Power & Serial data stream | Yes |
