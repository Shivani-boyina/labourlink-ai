# Employment forecast readiness

The current opportunities panel counts eligible openings. It also shows the highest current displayed match score. The original Logistic Regression artifact predicts its rule-generated match label using 16 inputs.

## Local evidence

| Source | Available evidence |
| --- | --- |
| Original model metadata and operational training CSVs | Rule-generated match labels. The CSV headers have no prediction date or verified job-start date. |
| V2 and V3 research files | 5,000 examples each. The research report identifies the labels as synthetic. |
| Wage reference slice | 25 aggregate wage records. |
| Match outcomes template | Zero observations. |
| Application and allocation entities | Application date, acceptance timestamp, allocation timestamp and scheduled work dates exist in the schema. No authorized longitudinal extract was available for this audit. An acceptance or scheduled date alone cannot establish a work start. |

A forecast cohort needs consent or another documented basis, a pseudonymous worker key, a reference timestamp, a snapshot of features available at that timestamp, a timestamped verified work start if one occurs, and the end of reliable follow-up. Record follow-up for workers without applications as well. Missing or censored observations remain unknown. Use the existing outcome event template in an authorized offline store and keep the follow-up cutoff with the reference cohort. No production export or tracking is enabled by this change.

For each horizon, label a verified first job start strictly after the reference timestamp and within the horizon as positive. Label a negative only after observing the whole horizon. Each positive 7-day outcome must also be positive at 30 days for the same reference cohort. Once enough longitudinal observations are available, evaluate a discrete-time survival baseline that produces both cumulative probabilities from one consistent event process. Fit preprocessing and calibration on earlier periods and keep a later holdout with a 30-day boundary gap. Report follow-up coverage, positive counts and rates, calibration and Brier score by horizon, uncertainty, and subgroup sample sizes. This checkout has no labeled forecast cohort, so validation and calibration metrics are unavailable.

## Matching service diagnostics

The authenticated worker recommendation response identifies eligible pairs and the first exclusion for other jobs. For eligible pairs, a valid model result has method ML. A rules result has method RULE_BASED and a fallback reason. MODEL_UNAVAILABLE indicates the model contract or inference could not be obtained or validated. FEATURES_UNAVAILABLE includes feature-specific issues. SCORING_LIMIT means the per-request prediction budget was reached. Inspect only those source and issue fields when recording diagnostics.

On the deployed Spring service, check that LABOURLINK_ML_URL is configured without printing it. From the same network, inspect FastAPI health and the feature contract, then verify a supported, non-personal inference fixture. Complete verification using a known supported pair in the authenticated deployed app and confirm Spring returns method ML and the UI renders that percentage. Health by itself only confirms service readiness. Use the application interface for a worker-specific eligibility check. The local MLPredictionClientTest verifies health, supported inference and the original contract over loopback without a database.
