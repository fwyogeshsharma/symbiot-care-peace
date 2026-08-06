# Sleep & Health Detection Algorithms — Reference

> A working reference for building detection/risk-scoring algorithms from sleep and
> wearable-sensor data. Formulas here are **illustrative starting points**, not
> clinically validated models. Every output is a **risk signal**, never a diagnosis.

---

## Table of Contents

**A. Sleep Disorders**
1. [Insomnia](#1-insomnia)
2. [Sleep Apnea](#2-sleep-apnea)
3. [Circadian Rhythm Disorder](#3-circadian-rhythm-disorder)
4. [Restless Leg Syndrome (RLS)](#4-restless-leg-syndrome-rls)
5. [REM Sleep Behavior Disorder (RBD)](#5-rem-sleep-behavior-disorder-rbd)
6. [Jet Lag / Shift Work Disorder](#6-jet-lag--shift-work-disorder)

**B. Mental Health & Cognition**
7. [Stress](#7-stress)
8. [Anxiety](#8-anxiety)
9. [Depression](#9-depression)
10. [Burnout](#10-burnout)
11. [Cognitive Decline](#11-cognitive-decline)
12. [Alzheimer's Risk (Long-Term)](#12-alzheimers-risk-long-term)
13. [Dementia Risk](#13-dementia-risk)
14. [Parkinson's Disease](#14-parkinsons-disease)

**C. Cardiometabolic**
15. [Cardiovascular Disease](#15-cardiovascular-disease)
16. [Hypertension Risk](#16-hypertension-risk)
17. [Atrial Fibrillation (AFib)](#17-atrial-fibrillation-afib)
18. [Heart Failure Risk](#18-heart-failure-risk)
19. [Diabetes Risk](#19-diabetes-risk)
20. [Obesity Risk](#20-obesity-risk)

**D. Recovery & Systemic**
21. [Chronic Fatigue Syndrome (CFS)](#21-chronic-fatigue-syndrome-cfs)
22. [Fibromyalgia](#22-fibromyalgia)
23. [Long COVID Recovery](#23-long-covid-recovery)
24. [Overtraining Syndrome](#24-overtraining-syndrome)
25. [Immune Stress / Early Illness](#25-immune-stress--early-illness)

[Common Signal Glossary](#common-signal-glossary) · [Implementation Notes](#implementation-notes)

---
# A. Sleep Disorders
---

## 1. Insomnia

**Features:** Sleep Efficiency · Sleep Latency · WASO · Sleep Duration · Awakenings · Sleep Consistency

### Sleep Efficiency
```
Sleep Efficiency = (Time Asleep / Time In Bed) × 100
```
**Example:** In bed = 8 hrs, Asleep = 6 hrs → **75%**

### Sleep Latency
```
Sleep Latency = Sleep Start Time − Lights Off Time
```
**Example:** Lights off = 10:00 PM, Sleep started = 11:10 PM → **70 min**

### Rule-based flag
```
IF   Sleep Efficiency < 85%
AND  Sleep Latency    > 30 min
AND  Awakenings       > 3
FOR  > 14 consecutive days
THEN → Possible chronic insomnia
```

### Weighted score
```
score = 0.35 × SleepEfficiency
      + 0.25 × (100 − LatencyScore)
      + 0.20 × (100 − WASOScore)
      + 0.20 × DurationScore

IF score < 70 → Insomnia risk
```
> Normalize each feature to 0–100 first. Latency and WASO are inverted (`100 − x`) so
> that "worse" raises risk correctly.

---

## 2. Sleep Apnea

**Sensors:** Respiratory Rate · Snoring · Heart Rate · SpO₂ · Movement
**Features:** AHI · Snoring Frequency · Lowest SpO₂ · Average SpO₂ · Respiration Variability · Night HR

### Detect events, then compute AHI
```
IF breathing stops > 10 sec → Apnea Event

AHI = (Apnea Events + Hypopnea Events) / Hours Slept
```
**Example:** 40 events over 8 hrs → AHI = **5**

### Classifier
```python
AHI = ApneaEvents / SleepHours

if   AHI < 5:   Risk = "Normal"
elif AHI < 15:  Risk = "Mild"
elif AHI < 30:  Risk = "Moderate"
else:           Risk = "Severe"
```

| AHI | Severity |
|-----|----------|
| < 5 | Normal |
| 5 – 15 | Mild |
| 15 – 30 | Moderate |
| > 30 | Severe |

> An ML step should separate genuine breathing pauses from **movement artifacts** before
> counting an event.

---

## 3. Circadian Rhythm Disorder

**Features:** Bed Time · Wake Time · Sleep Midpoint · Weekend Shift · Sleep Variability

### Algorithm
```
BedtimeSTD = std(BedTime)
WakeSTD    = std(WakeTime)

IF BedtimeSTD > 90 min → Circadian risk
```
> Measures timing *irregularity*. Track the sleep midpoint and weekend-vs-weekday shift
> ("social jet lag") as additional signals.

---

## 4. Restless Leg Syndrome (RLS)

**Features:** Leg Movements · Movement Count · Movement Intensity · Movement During Deep Sleep

### Periodic Leg Movement Index
```
PLMI = Periodic Leg Movements / Sleep Hours

IF PLMI > 15 → High risk
```

---

## 5. REM Sleep Behavior Disorder (RBD)

**Features:** REM Movement · REM Talking · REM Punching · REM Rolling

During normal REM, muscles should be atonic. RBD shows large motor activity during REM.
```
IF REM Movement > Threshold for 30 nights → Possible RBD
```
> RBD is an early marker often linked to later Parkinson's/neurodegeneration — see §14.

---

## 6. Jet Lag / Shift Work Disorder

**Features:** Sleep Timing · Circadian Shift · Sleep Efficiency · Sleep Debt

### Algorithm
```
ShiftHours = Today's Bedtime − Baseline Bedtime

IF ShiftHours > 3 → Circadian misalignment
```

---
# B. Mental Health & Cognition
---

## 7. Stress

**Features:** HRV · Night HR · Sleep Debt · Respiration · Recovery

### Stress score
```
StressScore = 0.40 × HRV_Drop
            + 0.30 × RHR_Increase
            + 0.20 × SleepDebt
            + 0.10 × RespRate
```
**Example baselines:** HRV 72 → 42 (drop −30); RHR 58 → 72 (increase +14).
> Use **HRV drop** and **RHR increase** (deviation from personal baseline), not raw
> values, so higher stress raises the score. Flag when elevated for several days.

---

## 8. Anxiety

**Features:** HRV · Sleep Latency · Awakenings · Respiration · Night HR

### Anxiety score
```
AnxietyScore = 0.30 × HRV_inv
             + 0.30 × SleepLatency
             + 0.20 × RHR
             + 0.20 × Awakenings
```
> Invert HRV (low HRV = higher anxiety) before weighting.

---

## 9. Depression

**Features:** REM % · Deep Sleep % · HRV · Sleep Variability · Night HR

Associated sleep changes: reduced efficiency, more awakenings, longer REM, reduced deep
sleep, irregular schedule, lower HRV.

### Score
```
DepressionScore = 0.30 × REM
                + 0.25 × DeepSleep
                + 0.25 × HRV
                + 0.20 × Variability
```
If confidence exceeds a threshold, show a **non-diagnostic** message, e.g.:
> "Your recent sleep pattern has changed significantly and may be associated with
> increased stress or mood changes."

> **Must not diagnose.** Present as an observation + suggestion to seek support.

---

## 10. Burnout

**Features:** Recovery · HRV · Resting HR · Deep Sleep · Sleep Debt

### Recovery Index
```
RecoveryIndex = 0.35 × HRV
              + 0.35 × SleepScore
              + 0.30 × RestingHR_inv

IF RecoveryIndex < 60 → Burnout risk
```
> Resting HR is inverse to recovery — invert it so a high RHR lowers the index.

---

## 11. Cognitive Decline

**Features:** Deep Sleep · REM · Night Awakenings · Sleep Regularity · Age

Looks for **trends over months**, not single nights.

---

## 12. Alzheimer's Risk (Long-Term)

**Features:** Deep Sleep % · REM % · Sleep Fragmentation · Sleep Consistency

### Algorithm
```
IF DeepSleep < 10% for 180 days → High risk
```
> Very long observation window. Deep-sleep loss and fragmentation are the key signals.

---

## 13. Dementia Risk

**Features:** Sleep Variability · Deep Sleep · Fragmentation · Night Wandering

### Score
```
DementiaScore = DeepSleep − Fragmentation − Variability
```
> Higher deep sleep raises the score; fragmentation and variability lower it.

---

## 14. Parkinson's Disease

**Features:** REM Movement · Tremor · Movement Pattern · Sleep Talking

### Algorithm
```
IF REM Movement + Night Tremor persist 90 days → Neurological risk
```
> Builds on RBD (§5). Persistent abnormality → recommend clinical evaluation.

---
# C. Cardiometabolic
---

## 15. Cardiovascular Disease

**Features:** HRV · Resting HR · Respiration · Deep Sleep · Age · BMI

### Score
```
CardioRisk = 0.30 × HRV_inv
           + 0.25 × RHR
           + 0.20 × Resp
           + 0.15 × Age
           + 0.10 × BMI
```
Candidate models: Logistic Regression · Random Forest · XGBoost · Deep NN.
Output is a **probability**, e.g. `CVD Risk = 21%`.

---

## 16. Hypertension Risk

**Features:** Night HR · HRV · Sleep Efficiency · Awakenings · Respiration

### Algorithm
```
IF NightHR > Baseline + 10
AND HRV decreasing
FOR 30 days
→ Hypertension risk
```

---

## 17. Atrial Fibrillation (AFib)
*(requires ECG/PPG support)*

**Features:** RR Interval · Beat Variability · Irregular Rhythm · Night HR

### Algorithm
```
IF Irregular RR > Threshold → Possible AFib
```
> PPG/ECG-based irregular-rhythm detection. Needs strong artifact rejection.

---

## 18. Heart Failure Risk

**Features:** Respiration · Night HR · HRV · Sleep Duration · Activity

### Algorithm
```
Risk = Resp_Increase + HR_Increase + HRV_Decrease
```
> All three measured as deviations from personal baseline.

---

## 19. Diabetes Risk

**Features:** Sleep Duration · Sleep Timing · HRV · BMI · Activity · Resting HR

Associated factors: short/irregular sleep, low HRV, elevated resting HR, obesity, low activity.

### Score
```
Risk = 0.25 × BMI
     + 0.20 × HRV_inv
     + 0.20 × Sleep
     + 0.20 × Activity_inv
     + 0.15 × RHR
```
Output: **Low / Medium / High**.

---

## 20. Obesity Risk

**Features:** Average Sleep · Sleep Debt · Activity · Eating Time · HRV

### Algorithm
```
IF Sleep < 6 hours for 30 days → Weight gain risk
```

---
# D. Recovery & Systemic
---

## 21. Chronic Fatigue Syndrome (CFS)

**Features:** Recovery · Sleep Debt · Deep Sleep · HRV · Resting HR

### Fatigue Index
```
FatigueIndex = Recovery − SleepDebt − HR_Increase
```
> Lower index = more fatigue burden.

---

## 22. Fibromyalgia

**Features:** Deep Sleep · Movement · Pain Episodes · Sleep Quality

### Pattern
```
Deep Sleep ↓  +  Movement ↑  +  Poor Recovery → Fibromyalgia risk
```

---

## 23. Long COVID Recovery

**Features:** HRV · Resting HR · Sleep Debt · Respiration · Recovery

### Recovery signal
```
Recovery = HRV + DeepSleep − Respiration_Increase
```
> Track the recovery trend over weeks; a persistent depression of HRV/recovery is the signal.

---

## 24. Overtraining Syndrome

**Features:** HRV · Resting HR · Recovery · Sleep Debt · Training Load

### Algorithm
```
IF HRV decreasing
AND Resting HR increasing
AND Recovery poor
→ Overtraining
```

---

## 25. Immune Stress / Early Illness

**Features:** Resting HR · Skin Temperature (if available) · HRV · Respiration · Sleep Quality

### Algorithm
```
IF RestingHR > Baseline + 8
AND Respiration increasing
AND HRV decreasing
→ Possible infection / physiological stress
```
> This pattern is commonly used by wearable platforms to flag that the body may be under
> physiological stress before symptoms appear.

---

## Common Signal Glossary

| Signal | Meaning | Direction of concern |
|--------|---------|----------------------|
| Sleep Efficiency | % of time in bed asleep | Lower = worse |
| Sleep Latency | Time to fall asleep | Higher = worse |
| WASO | Wake After Sleep Onset (min awake after first sleep) | Higher = worse |
| HRV | Heart Rate Variability | Lower = worse |
| Resting HR (RHR) | Baseline heart rate | Higher = worse |
| Night HR | Heart rate during sleep | Higher = worse |
| SpO₂ | Blood oxygen saturation | Dips = apnea signal |
| AHI | Apnea–Hypopnea Index (events/hr) | Higher = worse |
| PLMI | Periodic Leg Movement Index (events/hr) | Higher = worse |
| RR Interval | Beat-to-beat timing | Irregularity = AFib signal |
| Deep Sleep % | Share of night in deep (N3) sleep | Lower = worse |
| REM % | Share of night in REM | Context-dependent |
| Sleep Debt | Cumulative shortfall vs. need | Higher = worse |
| Sleep Variability / Regularity | Consistency of timing | More irregular = worse |
| Skin Temperature | Deviation from baseline | Elevated = illness signal |
| Recovery | Composite readiness | Lower = worse |

---

## Implementation Notes

**Normalization.** Put every feature on a comparable scale (z-score vs. personal baseline,
or 0–1 / 0–100 min-max) before any weighted sum. Mixing raw minutes, %, and bpm is not
meaningful otherwise.

**Direction consistency.** Some signals are "higher = worse" (latency, RHR, WASO, AHI) and
others "higher = better" (efficiency, HRV, deep sleep). Invert the good-direction ones —
marked `_inv` in the formulas above — so every term pushes risk the same way.

**Personal baselines.** HRV, resting HR, skin temperature, and sleep architecture vary a
lot between people. Compare each user against their own rolling baseline (e.g. 30-day
median), not a population constant. Most of the "increase / decrease" rules here mean
*deviation from personal baseline*.

**Temporal windows.** Single nights are noisy. Require persistence before flagging — this
ranges from 14 days (insomnia) to 30 (hypertension, obesity), 90 (Parkinson's), and 180
(Alzheimer's). Long-window conditions need trend analysis, not thresholds on one night.

**Artifact rejection.** Movement, poor contact, and naps create false signals. Validate
events — especially apnea (§2) and AFib (§17) — before counting them.

**Thresholds are placeholders.** Every threshold must be calibrated on real, labeled data
and validated. Use published clinical cutoffs where they exist (AHI ≥5/15/30; PLMI >15).

**Sensor dependencies.** Some modules need hardware many wearables lack: AFib needs
ECG/PPG, SpO₂ needs an oximeter, skin temperature needs a thermistor. Gate each module on
sensor availability.

**Not medical devices.** These outputs are wellness signals. Wording should describe
observations and suggest professional evaluation — never assert a diagnosis. Medical
claims trigger regulatory rules (FDA, CE, etc.).

**Model progression.** Sensible build order: rule-based flags → weighted scores → classical
ML (Logistic Regression, Random Forest, XGBoost) on labeled data → deep models once you
have volume and validation.