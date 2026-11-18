# LabourLink AI research dataset v2

Built 2026-11-13 from downloaded public source files. The original dataset and application files were not changed by this build. The v2 training CSV contains **synthetic matching examples only**; source-derived occupational and wage records are kept in separate processed tables.

## Scope of this report and proposed repository baseline

This report describes the broader local research workspace. The proposed repository baseline is a smaller selected snapshot; it does not contain every source, processed table, script, or result mentioned below. Counts and findings about excluded local artifacts describe that broader workspace and cannot all be reproduced from the proposed upload.

The proposed baseline includes the five O*NET Database 31.0 reference CSVs listed below, the synthetic worker and job profile tables, `labourlink_ai_dataset_v2.csv`, and the selected reference templates under `data/ml/`. It also includes this report for methodology and attribution. O*NET attribution: O*NET Database 31.0, U.S. Department of Labor / Employment and Training Administration, made available under CC BY 4.0; see the [official O*NET database license](https://www.onetcenter.org/license_db.html). The included O*NET files are reference data; the synthetic records derived from the taxonomy are described below.

The proposed baseline excludes DGE/NCO source material and derived records; Labour Bureau source material and derived records; Indian worker and contract-labour source material; the V3 datasets and their generated outputs; other local research outputs not selected for upload; and `build_research_dataset_v2.py` plus scripts or outputs that depend on excluded source files. The report's descriptions of those files are documentation of the local research workspace, not a claim that they are present in or reproducible from the proposed repository snapshot. Permission to reuse or redistribute DGE or Labour Bureau material has not been established here. Confirm applicable terms before publishing those materials; see the [DGE website policy](https://dge.gov.in/website-policy) and [Labour Bureau website policy](https://labourbureau.gov.in/websitepolicy).

All synthetic profiles and rule-generated matching labels are experimental examples, not real workers, vacancies, contractor offers, or observed hiring outcomes. This applies to the V2 and V3 tables described in this report.

Following the requested focus on construction trades across India, I added a separate v3 training table. The v2 CSV remains in place and unchanged by this follow-up.

## Dataset composition

| Record class | Count | Interpretation |
| --- | ---: | --- |
| O*NET occupation records processed | 1,016 | Genuine US occupational taxonomy records with source codes, descriptions, top 10 importance-rated skills, up to 5 core tasks, and up to 10 source-ranked related occupations. O*NET source files are included in the proposed baseline. |
| DGE NCO 2015 occupation catalog records processed | 3,447 | Genuine Indian occupational catalog rows with NCO codes and classification hierarchy. Catalog source does not provide skill/task details in the listing table. DGE source and derived files are excluded from the proposed baseline. |
| Labour Bureau rural-wage observations processed | 5,000 | Genuine published aggregate occupation/state/time wage rows parsed from the downloaded official page. These are not worker records. Labour Bureau source and derived files are excluded from the proposed baseline. |
| Genuine job vacancy records | 0 | No openly downloadable, provenance- and license-verified vacancy dataset suitable for this daily-wage matching task was found and incorporated. |
| Genuine worker records | 0 | No open verified worker profiles incorporated. |
| Actual matching/hiring outcomes | 0 | No public ground-truth daily-wage worker-to-vacancy outcomes incorporated. |
| Synthetic worker profiles | 1,000 | Generated from O*NET occupation skill taxonomies; every profile is identified as synthetic. |
| Synthetic job profiles | 500 | Generated from O*NET occupation titles and skill taxonomies; every role is identified as synthetic, not a live vacancy. |
| Synthetic matching examples | 5,000 | Unique pairs sampled from the stable 1,000-worker by 500-job ID pools. IDs recur across pairs. |
| Rule-generated labels | 5,000 | `match_label=1` when listed-skill overlap is at least 50%; otherwise `0`. These are not observed hiring outcomes. |

### Indian worker and contractor data discovered in this follow-up

- **Contract labour:** downloaded the official Rajya Sabha response and processed 20 Central-sphere regional aggregate rows plus the published total in `processed_sources/contract_labour_statistics_2020_21.csv`. For 2020–21, the annexure reports 9,613 principal-employer registrations, 41,130 contractor licences, and 2,430,989 contract labourers covered by licences across its reported regions. These are counts, not individual workers or contractor profiles. The source explains that the Ministry did not maintain central gender- or sector-wise breakdowns in that response.
- **eShram:** OGD lists a daily, anonymized, district-wise demographic dataset under the Government Open Data License–India. Its published catalog page and resource page were downloaded, but the linked CSV returned HTTP 403 from the official file host. Therefore no eShram records are included or counted. The public data is aggregate and is not a source of named worker profiles or actual job matches.
- **Practical implication:** the genuine Indian information now included covers Indian occupations, rural wage benchmarks, and contract-labour scale by region. Public sources found here do not provide the individual worker skills/availability and contractor job requirements/outcomes needed to train a genuine LabourLink matching model. Those records would need to come from consented LabourLink platform data or an authorized government data-sharing arrangement.

### Construction trades nationwide – v3

- Training table: `labourlink_ai_construction_matching_v3.csv`, 5,000 synthetic worker–contractor-job pairs.
- Stable related records: 1,000 generated worker profiles, 250 generated contractor placeholders, and 500 generated contractor job requests (two per contractor); all 1,000 workers, all 250 contractors, and all 500 jobs occur in the 5,000 unique pairs.
- Coverage: generated profiles span all 28 Indian states and 8 Union Territories. These are synthetic locations, not observed worker distributions.
- Indian trade references: 10 NCO 2015 trades in `processed_sources/india_construction_trade_reference.csv` (construction labourer, mason, carpenter, plumber, electrician, painter, tile setter, welder, scaffolder, construction helper). Codes/titles come from the DGE NCO 2015 catalog. Skill tags are clearly marked as a synthetic prototype mapping; they are not measured worker skills or a claim that the NCO table contains those skills.
- Wage references: 875 genuine Labour Bureau aggregate rows across 12 states for five available trade categories (construction workers, mason, carpenter, plumber, electrician) in `processed_sources/india_construction_wage_references.csv`. No wage value is imputed for a state/trade without a matching source observation. Where an observation exists, the source reference is the mean of the published Men/Women values available for that row; synthetic job offers perturb that aggregate reference by a generated factor. These are not actual contractor offers or worker expectations. Paint, tile, welding, and scaffolding roles lack direct matched wage categories in this source subset.
- Labels: all 5,000 v3 `match_label` values are synthetic rule outputs. A positive requires a compatible trade, at least 40% skill-tag overlap, and the same state/UT or synthetic willingness to relocate. Current split: 240 positive, 4,760 negative. This is an experimental constructed distribution, not measured hiring prevalence.
- Real profile/outcome count for v3: zero worker profiles, zero identified contractors, zero real vacancies, and zero match outcomes. The contractor IDs and records are generated placeholders with blank names/contact fields and unverified licence status.
- Contractor scale context is separate: `processed_sources/contract_labour_statistics_2020_21.csv` has 20 reported Central-sphere region aggregates and one published total, not a register of 41,130 named contractors.

The training CSV's 5,000 rows are **not** a count of real people, vacancies, or actual matches. Positive/negative label counts are recorded in `processed_sources/dataset_counts.json`.

## Source-by-source inventory

### O*NET Database 31.0

- Publisher: U.S. Department of Labor, Employment and Training Administration; National Center for O*NET Development.
- Download page: [O*NET Database](https://www.onetcenter.org/database.html).
- License: O*NET database downloads are provided under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); attribution and notice of modifications are required. See also [O*NET licensing](https://www.onetonline.org/help/license).
- Downloaded original files and source row counts: `occupation_data.csv` 1,016; `essential_skills.csv` 18,200 rating rows; `task_statements.csv` 18,838; `related_occupations.csv` 18,460; `content_model_reference.csv` downloaded for skill descriptions. Skill records contain ratings, not worker-level skill observations.
- Processed: 1,016 occupational records in `processed_sources/occupational_records.csv`. Skill descriptions are joined by official O*NET element ID; task statements are limited to five core statements per occupation; related occupations preserve source-ranked codes/titles/tiers (up to ten per occupation).
- Limitations: O*NET is a US occupational taxonomy, not an Indian vacancy or worker sample. No India daily wage was joined to these occupations because no reliable direct occupation-code crosswalk was established.
- Exact raw paths: `raw_sources/onet/occupation_data.csv`, `raw_sources/onet/essential_skills.csv`, `raw_sources/onet/task_statements.csv`, `raw_sources/onet/related_occupations.csv`, `raw_sources/onet/content_model_reference.csv`.

### Labour Bureau of India – Rural Wages

- Publisher: Labour Bureau, Ministry of Labour and Employment, Government of India.
- Source: [Rural Wages in India](https://labourbureau.gov.in/rural-wages).
- Downloaded original material: page snapshot `raw_sources/labour_bureau/rural_wages.html` and official report `raw_sources/labour_bureau/wage_rates_rural_india_2024_25.pdf`.
- Original page table rows parsed: 5,000. Processed output: 5,000 in `processed_sources/labour_bureau_rural_wages.csv`; source serial number, period, state, occupation/item, and men/women wage values are retained, plus source URL.
- License/usage: the downloaded source page did not display a clear open-data reuse license. Attribution is retained; confirm applicable reuse terms before redistributing the source table or a derivative. Values are published aggregate sample-village daily wage rates and are not individual worker wages or job offers.
- Limitations: these observations are not matching labels, vacancies, or worker profiles; occupation coverage and survey period vary by row. They were not force-mapped to O*NET/NCO codes or used as fabricated individual pay values.

### Directorate General of Employment – NCO 2015 (India)

- Publisher: Directorate General of Employment, Ministry of Labour and Employment, Government of India.
- Sources: [NCO 2015 catalog](https://dge.gov.in/nat), [official NCO 2015 download page](https://www.dge.gov.in/nco-2015).
- Downloaded original material: `raw_sources/dge_nco/nco_2015_occupation_catalog.html`, `raw_sources/dge_nco/nco_2015_occupation_catalog_page_1.html` through `_page_6.html`, and NCO Volume I code structure PDF (`raw_sources/dge_nco/nco_2015_volume_i_codes.pdf`).
- Downloaded official occupational-description volumes II-A and II-B at `raw_sources/dge_nco/nco_2015_volume_ii_a.pdf` and `_volume_ii_b.pdf`; they are retained as source files. The v3 profile mapping currently uses catalog codes/titles and marks its skill tags synthetic.
- Catalog rows: 3,447 across seven downloaded pages (serials 1–3,447); processed count: 3,447 in `processed_sources/occupational_records.csv`. NCO 2015 and NCO 2004 identifiers are retained as fixed-width strings, alongside division, subdivision, group, and family.
- License/usage: no explicit open reuse license was found on the catalog/download page during this work. Source attribution is retained; review government website terms before redistribution.
- Limitations: this catalog provides occupation labels and hierarchy, not worker profiles, vacancy records, observed skills, or matches. The downloaded Volume I is a code-structure document, not an additional row-level dataset.

### ESCO

- Publisher: European Commission.
- Official [ESCO download page](https://esco.ec.europa.eu/en/use-esco/download) states ESCO v1.2.1 (updated 2025-12-10) and offers CSV/ODS/RDF packages. Its current workflow requires choosing a package, accepting a privacy notice, and supplying an email address to receive a download link. No email was submitted and no ESCO data file was obtained; therefore **zero ESCO rows are included**.
- Usage: ESCO's [FAQ](https://esco.ec.europa.eu/en/about-esco/faq) describes free reuse with acknowledgement and identification of adaptations. Confirm the exact terms for the selected package/version before reuse.
- Limitation: taxonomy is European and should not be treated as Indian hiring or wage data; it could be added later with an authorized package download and an explicit India crosswalk.

### Other employment and matching sources reviewed

- **MoSPI PLFS microdata**: [PLFS catalog](https://microdata.gov.in/NADA/index.php/catalog/284) contains relevant Indian labour-force data, but unit-level access requires user login/registration. No microdata file or individual record was downloaded or included. Its survey records would still not be actual worker-to-vacancy match outcomes.
- **National Career Service**: public vacancy pages reviewed; no downloadable, reusable daily-wage worker/vacancy matching file was established for this build. Public listings are not evidence of a completed hire.
- **Contract labour records**: the Ministry's parliamentary response provides Central-sphere summary counts by region, not named contractor details or worker-level records. The 2020–21 official annexure is downloaded at `raw_sources/indian_worker_contract_data/contract_labour_2020_21_annexure_rs.pdf`; the aggregate table is in `processed_sources/contract_labour_statistics_2020_21.csv`.
- The parliamentary PDF does not state a separate open-data license; the report and derived aggregates retain the question/annexure attribution. The totals validate against the 20 regional rows in the annexure.
- **eShram OGD**: [dataset catalog](https://www.data.gov.in/catalog/demographic-data-unorganised-workers-registered-eshram-portal) says the resource is daily and district-wise and the platform identifies published datasets as Government Open Data License–India. Catalog and resource snapshots are at `raw_sources/indian_worker_contract_data/eshram_ogd_catalog.html` and `eshram_ogd_resource.html`. The advertised CSV URL returned HTTP 403, so no worker counts from that resource were processed. It does not expose personally identifying worker profiles for public reuse.
- **GitHub, Kaggle, Zenodo, Hugging Face**: searches found candidate matching repositories, including synthetic or incompletely licensed/user-contributed examples. No additional third-party records were added because a suitable India daily-wage dataset with a verifiable underlying source, usable license, and non-synthetic ground truth could not be established. A repository card or MIT tag alone does not establish that the underlying resume/job content is licensed or genuine.

## ML usage and limitations

`labourlink_ai_dataset_v2.csv` is a binary-classification experiment table included in the proposed baseline. The target `match_label` is fully rule-generated using `skill_overlap_percent >= 50`, based on skills from the O*NET taxonomy. The 1,000 synthetic worker IDs and 500 synthetic job IDs repeat across examples; pair IDs are unique. `record_type`, `worker_is_synthetic`, `job_is_synthetic`, `match_outcome_is_observed`, and `label_source` make the generated nature explicit. Wage data is not joined into pair rows.

Performance against these labels measures how well a model reproduces this overlap rule. It does **not** estimate real-world hiring accuracy, worker quality, employer satisfaction, or fairness. Use the separate occupational and wage reference files for taxonomy and descriptive wage context; do not treat them as match outcomes.

## Outputs and proposed upload scope

The following artifacts are in the proposed baseline:

- Main synthetic ML table: `labourlink_ai_dataset_v2.csv`.
- O*NET source references: the five `raw_sources/onet/` CSVs listed above.
- Synthetic profile tables: `processed_sources/synthetic_worker_profiles.csv` and `processed_sources/synthetic_job_profiles.csv`.
- Selected reference templates: `data/ml/match_outcomes_template.csv`, `data/ml/occupation_skill_reference_template.csv`, and `data/ml/wage_reference_template.csv`.
- This report and the selected test-safety configuration/code are part of the proposed project snapshot; they are not dataset build inputs.

The following are local research-workspace artifacts but are **not** in the proposed baseline: `labourlink_ai_construction_matching_v3.csv`; `processed_sources/occupational_records.csv`, `processed_sources/labour_bureau_rural_wages.csv`, `processed_sources/india_construction_trade_reference.csv`, `processed_sources/india_construction_wage_references.csv`, `processed_sources/contract_labour_statistics_2020_21.csv`, and `processed_sources/dataset_counts.json`; the V3 construction profile tables under `processed_sources/`; the source files under `raw_sources/dge_nco/`, `raw_sources/labour_bureau/`, and `raw_sources/indian_worker_contract_data/`; and `build_research_dataset_v2.py`. The broader `raw_sources/` directory is not included wholesale. These excluded files are not available from the proposed snapshot, so the report's local-workspace counts and V3 results cannot be rebuilt from the uploaded files alone.
