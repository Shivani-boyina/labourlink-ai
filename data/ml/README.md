# LabourLink matching data

## Dataset choice

There is no suitable public Indian dataset that contains consented worker profiles, live vacancies, and verified worker–job outcomes together. A generic job recommendation dataset would not represent LabourLink's daily-wage work, local availability, coarse geography, or hiring workflow, so it should not be used as if it were training data for this product.

Use a two-part data plan:

1. **Reference data now:** use NSDC National Occupational Standards / Qualification Packs to standardize occupation and skill names. Use Labour Bureau wage publications as contextual reference values only. They are not personal wage expectations or match labels. The root-level `labourlinkai.csv` contains 25 rows from the official Rural Wages page: Andhra Pradesh, January 2025-2026 survey-year listing.
2. **10,000-record public research extract:** MoSPI's PLFS Calendar Year 2025 is the strongest verified source found for an India-relevant wage/occupation model. Its metadata reports 1,148,634 surveyed people, with worker occupation, industry, and earnings indicators. The microdata files require a registered Microdata Portal account; they cannot be fetched from this workspace without an authenticated download. After obtaining the files and checking their data access agreement, prepare a de-identified 10,000-row sample for a defined task such as wage estimation or occupation classification.
3. **LabourLink matching model:** collect pseudonymized snapshots and explicit application/decision/work-start outcomes from LabourLink, with an appropriate consent or other documented basis. PLFS does not contain LabourLink vacancy impressions, applications, hires, or placements. Until those outcome events exist in sufficient volume, keep the current explainable rule-based recommender; do not fit a matching model to synthetic rows, applications alone, or aggregate wage statistics.

The official NSDC page links sector-wise NOS/QP materials and a QP-NOS list: <https://nsdcindia.org/nos>. The Labour Bureau publishes rural wage data by state, year/month, occupation and sex: <https://labourbureau.gov.in/en/rural-wages>. Its occupation wages page is a separate industry/occupation wage reference: <https://www.labourbureau.gov.in/occupation-wages>. Check each downloaded file's current version, definitions, and reuse terms before importing it. The machine-readable source manifest is `source_manifest.json`.

The MoSPI PLFS catalog lists current studies and identifies their public-use-data records; study downloads require login or free registration: <https://microdata.gov.in/NADA/index.php/catalog/PLFS>. The 2025 study metadata lists the survey scale and coverage: <https://microdata.gov.in/NADA/index.php/metadata/export/284/json>. MoSPI's access policy distinguishes open publications from registered microdata and states that non-commercial access is free after registration: <https://mospi.gov.in/faq>.

## Files

- `match_outcomes_template.csv`: one row per recorded matching event; use random pseudonymous keys, never account identifiers.
- `occupation_skill_reference_template.csv`: versioned skill/occupation vocabulary import shape.
- `wage_reference_template.csv`: aggregate reference values with unit and source metadata.
- `source_manifest.json`: source selection and collection status.

In `labourlinkai.csv`, `wage_*_raw` preserves the portal's original numeric value or marker; the numeric `wage_*_inr_per_day` columns are blank where the portal shows `@` or `-`. The extract is a one-state, one-month slice for transparency and should not be treated as nationwide coverage.

## To create the requested 10,000-row extract

Download the PLFS Calendar Year 2025 public-use data through the Microdata Portal account authorized to access it, then place the original archive and documentation in a local, non-public working folder. Share/upload those files into this project session. The exact CSV schema should be built from the accompanying codebook and the permitted use conditions; do not assume variable names or export fields before inspecting that documentation. Preserve survey weights and design variables where required by the study methodology, and exclude direct identifiers or detailed geography. The resulting 10,000-row file can be a documented model dataset for wages/occupation; it must not be described as a worker-job match dataset.

These are empty schemas, not datasets. Keep imported source files immutable and record their checksum and retrieval date in the manifest. Keep personal data and credentials out of all research exports. `unknown`/blank means not observed; it must not be converted to zero. Do not interpret a missing application as a negative label. Do not infer a hire or successful placement from acceptance; record the actual outcome.

## Model-ready event requirements

For each recommendation impression, preserve the worker/job feature snapshot timestamp, displayed rank, and the later event (apply, contractor decision, started, completed, or withdrew). Capture job and worker features as they were at impression time so later edits do not leak into training. Split evaluation by time and group by worker and job. Keep availability, open status, and capacity as eligibility checks outside the learned ranking score.

Before a training run, require documented provenance, consent/basis, unit and code validation, privacy review, outcome definitions, a temporal holdout, and a comparison against the current rule baseline. Report precision/recall at top-k and subgroup coverage/performance across coarse location and skill groups. Do not include names, phone numbers, passwords, exact addresses, or contractor identifiers.
