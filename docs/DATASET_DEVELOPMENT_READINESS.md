# LabourLink AI — Dataset Development Readiness

## Readiness summary

- **Dataset workbook/schema artifact:** not found in the repository. No workbook was modified or created in another format to replace an existing artifact.
- **Operational application schema:** exists in JPA entities, but is not a research dataset schema and is insufficient by itself for supervised matching evaluation.
- **Collected records:** none. No real identities, synthetic people, labels, or wage values were added.
- **Source inventory:** candidate official sources below; no source data has been downloaded or ingested. Provenance/redistribution terms must be reviewed for each dataset before collection.

## Current operational fields and gaps

| Entity | Current fields | Research limitations |
|---|---|---|
| Worker | Name, phone, password, one skill, experience years, free-text location, availability, optional expected daily wage | PII/password must never enter research export; no skill code, language, availability timestamp, coarse location code, or verification provenance |
| Job | Title, description, required skill, free-text location, daily wage, required worker count, optional minimum experience and duration, status, contractor ID | No occupation code, wage currency/unit metadata, location code, source/provenance, or publish/close timestamps |
| Application | Worker/job IDs, string date, status | No event history, decision timestamp/reason, actor, or outcome provenance; cannot train from a single current status alone |
| Contractor | Name, company, phone, location, password | Direct identifiers and authentication secrets are excluded from any analytical extract |

The workflow follow-up adds nullable `minimumExperience`, `durationDays`, and `expectedWagePerDay` fields to the operational entities. With the existing Hibernate `update` setting, these are additive nullable columns on application startup; existing rows remain valid. No database has been connected to or altered during this work, so the generated DDL still requires review in an isolated environment.

## Proposed research tables (design only)

Keep data collection separate from production account tables. Use stable source provenance and pseudonymous keys.

1. **occupation_skill_reference**: `occupation_code`, `occupation_system` (e.g. NCO/NOS/QP), `occupation_name`, `skill_code`, `skill_name`, `language`, `source_id`, `source_record_id`, `valid_from`, `valid_to`.
2. **wage_reference**: `wage_record_id`, `occupation_code` (nullable if unavailable), `sector`, `state_code`/published geography, `wage_amount`, `currency`, `wage_period`, `reference_period`, `statistic_type`, `source_id`, `source_record_id`, `retrieved_at`, `license_note`.
3. **opportunity_snapshot**: pseudonymous job ID, occupation/skill codes, coarse location code, wage amount/unit, experience requirement (nullable), duration (nullable), worker count, status, published/closed timestamps, and source provenance. For platform-created opportunities, source is “platform” and contractor personal data is excluded.
4. **worker_skill_snapshot**: random/pseudonymous worker key, standardized skill codes, experience (nullable), coarse location code, availability and timestamp, optional expected wage (nullable), collection consent/basis, and source/provenance. Never include name, phone, password, precise address, or government identifier.
5. **match_outcome_event**: pseudonymous worker/job keys, feature snapshot timestamp, displayed/ranked position, application/accept/reject/hire event, event timestamp, decision provenance, and split/group key. Do not infer hire from acceptance unless the product records it explicitly.

Null means unknown/not collected. Zero is used only when observed as a true numeric zero. Derived features should be stored separately from raw/source values.

## Source inventory

| Source | Candidate contribution | Status and constraints |
|---|---|---|
| [National Career Service](https://www.ncs.gov.in/) | Job-role vocabulary, career/job-search context, and possibly opportunities only through an authorized export or approved access path | NCS is a live employment platform, not established here as an open bulk dataset/API. Its [disclaimer](https://ncs.gov.in/disclaimer) says it is a facilitator and users should exercise due diligence; do not scrape profiles or copy personal jobseeker records. Seek explicit data access/terms before reuse. |
| [Labour Bureau Occupation Wages](https://labourbureau.gov.in/occupation-wages) | Aggregated wage reference by displayed base year, sector, occupation, year, and period | Official public query page; confirm downloadable record-level metadata, coverage, units, and reuse terms at collection time. Values are contextual aggregates, not individual worker wage labels. |
| [Labour Bureau Occupational Wage Survey](https://www.labourbureau.gov.in/occupational-wage-survey) | Occupation-wise wage/employment context and survey definitions | Official survey description notes occupation/industry-focused statistics; confirm round-specific documentation and units before use. |
| [NSDC National Occupational Standards](https://www.nsdcindia.org/national-occupational-standards-and-model-curriculum) | Skill/occupation taxonomy, role definitions, competency/qualification mapping | Taxonomy/reference source, not a worker dataset or proof that a person holds a qualification. Record QP/NOS version and source IDs; check the linked sector council's terms. |
| [Open Government Data Platform India — Labour and Employment group](https://data.gov.in/dataset-group-name/labour-and-employment) | Discovery point for ministry datasets | The portal's [policy page](https://data.gov.in/policies) describes the Government Open Data License-India, and the [license](https://data.gov.in/Godl) excludes personal information and data the provider is not authorized to license. The accessed group view is a sandbox/empty listing. Verify the actual dataset page, steward, license, update date, and downloadable/API fields before ingestion. |
| [Ministry of Labour & Employment / eShram](https://www.labour.gov.in/offerings) | Potential aggregate unorganised-worker context | The Ministry describes eShram as a national database containing Aadhaar-seeded worker data and identifies data-sharing controls. Do not seek or ingest personal-level data; use only specifically published anonymized aggregate data with documented terms. |

Source inventory checked on 2026-11-12. Official pages can change; recheck versions, metadata, and terms when selecting a concrete download. No data source currently has an approved local dataset file.

## Feature definitions for a transparent baseline

- **Skill compatibility:** exact standardized occupation/skill code is a full match; reviewed synonym/adjacent NOS relation may receive a lower documented score; no unreviewed fuzzy match should be treated as qualification.
- **Availability:** a hard eligibility gate based on a current, timestamped worker-provided availability value; stale availability is unknown, not available.
- **Location proximity:** use shared coarse administrative geography or a documented distance calculation from consented/coarse coordinates. Do not derive from/store precise home addresses. Missing location yields unknown, not zero distance.
- **Experience:** compare observed years against an explicit job minimum; when no minimum exists, use a bounded, documented preference component rather than an eligibility gate. Missing is unknown.
- **Expected wage:** compare job daily wage with a worker-entered expected daily wage only when both have compatible currency/unit; use an interpretable tolerance/fit score. Do not substitute aggregate Labour Bureau wages for a person's expectation.
- **Job requirements:** apply explicit must-have constraints first (status OPEN, positions available, availability, required skill); rank remaining eligible opportunities with explainable component scores.

Implemented initial baseline: eligible availability and OPEN/capacity are hard gates; skill is 40 points, exact coarse text-location match 25 points, experience fit 15 points, and daily-wage fit 20 points (a missing worker wage contributes no wage points). Scores are returned with recommendations. Current location matching is exact text equality, not geographic proximity; no synonym skill taxonomy exists yet. This is a deterministic rule, not ML, and needs evaluation against traceable held-out outcomes before being treated as effective.

## Label strategy

- Positive labels should come from consented, recorded downstream outcomes (e.g. accepted and separately confirmed started/completed work), not merely a recommendation impression or application.
- Preserve PENDING/ACCEPTED/REJECTED as workflow events. Rejection and non-response are not automatically “bad match” labels because they can reflect capacity or timing.
- Record label source, timestamp, actor type, and confidence. Use human review for ambiguous labels; do not fabricate labels to balance classes.

## Validation and split plan

- Validate source IDs, duplicate source records, code/version, units, allowed ranges, null semantics, date order, and geographic hierarchy. Keep raw source snapshots immutable and transformations reproducible.
- Separate source/reference tables from user-provided/platform event records. Review PII and license before joins or exports.
- Split by time and group by worker and job (and, where feasible, contractor/source) to prevent repeated entities leaking across train/test. Keep a final temporal holdout; fit vocabularies, imputation, scaling, and feature selection on training data only.
- Report coverage, null rates, class rates, precision/recall at practical top-k, calibration where applicable, subgroup performance by coarse geography/skill/language, and a simple popularity/random baseline.
- Do not train until sufficient consented, traceable outcome data exists. Until then, use the explainable deterministic baseline and human review.

## Immediate next steps

1. Locate the team's existing workbook outside this repository and inspect its sheets before changing anything; none is present in this checkout.
2. Choose concrete datasets from OGD/Labour Bureau after verifying live download, metadata, license, date, and coverage.
3. Agree on coarse geography, standard occupation/skill codes, consent and retention rules, and outcome definitions.
4. Create an immutable source manifest with URL, steward, source record/dataset ID, license, retrieval timestamp, version, checksum, and transformation history.
