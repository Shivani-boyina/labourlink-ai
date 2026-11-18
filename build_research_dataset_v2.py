"""Build LabourLink AI v2 from downloaded O*NET and Labour Bureau files.

Source-derived occupational and wage tables remain separate from generated
worker/job matching pairs. Matching labels are rules for pipeline experiments,
not observed hiring outcomes.
"""
from __future__ import annotations

import csv
import hashlib
import json
import random
import re
from collections import defaultdict
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent
RAW = ROOT / "raw_sources"
OUT = ROOT / "processed_sources"
OUT.mkdir(exist_ok=True)
SEED = 240513


def read_csv(path: Path) -> pd.DataFrame:
    return pd.read_csv(path, dtype=str, keep_default_na=False, encoding="utf-8-sig")


def main() -> None:
    occupations = read_csv(RAW / "onet" / "occupation_data.csv")
    skills = read_csv(RAW / "onet" / "essential_skills.csv")
    tasks = read_csv(RAW / "onet" / "task_statements.csv")
    model_ref = read_csv(RAW / "onet" / "content_model_reference.csv")
    related_rows = read_csv(RAW / "onet" / "related_occupations.csv")

    desc = dict(zip(model_ref["Element ID"], model_ref["Description"]))
    importance = skills[(skills["Scale ID"] == "IM") & (skills["Scale Name"] == "Importance")].copy()
    importance["_score"] = pd.to_numeric(importance["Data Value"], errors="coerce")
    skill_by_occ: dict[str, list[tuple[str, str, str]]] = defaultdict(list)
    for _, row in importance.iterrows():
        skill_by_occ[row["O*NET-SOC Code"]].append((row["Element Name"], desc.get(row["Element ID"], ""), row["Data Value"]))
    for code in skill_by_occ:
        skill_by_occ[code].sort(key=lambda x: float(x[2] or 0), reverse=True)

    task_by_occ: dict[str, list[tuple[str, str]]] = defaultdict(list)
    for _, row in tasks.iterrows():
        if row["Task Type"].lower() == "core":
            task_by_occ[row["O*NET-SOC Code"]].append((row["Task ID"], row["Task"]))

    related_by_occ: dict[str, list[tuple[str, str, str]]] = defaultdict(list)
    for _, row in related_rows.iterrows():
        related_by_occ[row["O*NET-SOC Code"]].append((row["Related O*NET-SOC Code"], row["Related Title"], row["Relatedness Tier"]))
    title_by_code = dict(zip(occupations["O*NET-SOC Code"], occupations["Title"]))
    occ_records = []
    for _, row in occupations.iterrows():
        code = row["O*NET-SOC Code"]
        selected = skill_by_occ.get(code, [])[:10]
        related = related_by_occ.get(code, [])[:10]
        core_tasks = task_by_occ.get(code, [])[:5]
        occ_records.append({
            "occupation_code": code,
            "occupation_title": row["Title"],
            "occupation_description": row["Description"],
            "skill_names": " | ".join(x[0] for x in selected),
            "skill_descriptions": " | ".join(x[1] for x in selected),
            "skill_importance_scores": " | ".join(x[2] for x in selected),
            "task_ids": " | ".join(x[0] for x in core_tasks),
            "task_descriptions": " | ".join(x[1] for x in core_tasks),
            "related_occupation_codes": " | ".join(x[0] for x in related),
            "related_occupation_titles": " | ".join(x[1] for x in related),
            "related_occupation_tiers": " | ".join(x[2] for x in related),
            "related_occupations_method": "O*NET Related Occupations table; first 10 source-ranked rows",
            "wage_reference": "",
            "wage_reference_note": "No directly comparable occupation-level India daily wage mapped",
            "source": "O*NET Database 31.0",
            "source_record_id": code,
            "source_url": "https://www.onetcenter.org/database.html",
        })
    # DGE NCO catalog codes must remain fixed-width strings; a numeric HTML
    # parser otherwise drops meaningful trailing zeroes from the official IDs.
    def nco_code(value: object) -> str:
        if pd.isna(value) or str(value).strip() == "":
            return ""
        whole, _, fraction = str(value).partition(".")
        return f"{whole}.{fraction[:4].ljust(4, '0')}"

    nco_records = []
    catalog_files = [RAW / "dge_nco" / "nco_2015_occupation_catalog.html"] + [
        RAW / "dge_nco" / f"nco_2015_occupation_catalog_page_{i}.html" for i in range(1, 7)
    ]
    for page in catalog_files:
        page_df = pd.concat(pd.read_html(page, flavor="lxml"), ignore_index=True)
        for _, row in page_df.iterrows():
            code = nco_code(row["NCO 2015"])
            nco_records.append({
                "occupation_code": code, "occupation_title": str(row["Occupational Title"]),
                "occupation_description": "", "skill_names": "", "skill_descriptions": "",
                "skill_importance_scores": "", "task_ids": "", "task_descriptions": "",
                "related_occupation_codes": "", "related_occupation_titles": "",
                "related_occupation_tiers": "", "related_occupations_method": "",
                "wage_reference": "", "wage_reference_note": "No directly comparable occupation-level India daily wage mapped",
                "nco_2004_code": nco_code(row["NCO 2004"]), "nco_division": row["Division"],
                "nco_sub_division": row["Sub Division"], "nco_group": row["Group"], "nco_family": row["Family"],
                "source": "Directorate General of Employment NCO 2015 catalog",
                "source_record_id": code, "source_url": "https://dge.gov.in/nat",
            })
    for rec in occ_records:
        rec.update({"nco_2004_code": "", "nco_division": "", "nco_sub_division": "", "nco_group": "", "nco_family": ""})
    all_occupations = occ_records + nco_records
    occ_path = OUT / "occupational_records.csv"
    pd.DataFrame(all_occupations).to_csv(occ_path, index=False, quoting=csv.QUOTE_MINIMAL)

    # Extract the complete table embedded in the downloaded Labour Bureau HTML.
    wage_frames = pd.read_html(RAW / "labour_bureau" / "rural_wages.html")
    wages = wage_frames[0].copy()
    wages["source"] = "Labour Bureau Rural Wages in India"
    wages["source_record_id"] = wages["S.No"].astype(str)
    wages["source_url"] = "https://labourbureau.gov.in/rural-wages"
    wages.to_csv(OUT / "labour_bureau_rural_wages.csv", index=False, quoting=csv.QUOTE_MINIMAL)

    # Parliamentary annexure: region-level totals only, not contractor identities.
    contract_stats = [
        (1,"Ahmedabad",593,2988,160847),(2,"Ajmer",771,2619,246737),(3,"Asansol",244,612,11512),
        (4,"Bangalore",199,2113,172029),(5,"Bhubaneswar",1253,2728,173813),(6,"Chandigarh",1349,7210,433035),
        (7,"Chennai",11,806,46797),(8,"Cochin",18,328,24046),(9,"Delhi",52,386,53528),
        (10,"Dhanbad",698,1518,151138),(11,"Dehradun",10,539,20377),(12,"Guwahati",21,462,42083),
        (13,"Hyderabad",1120,7731,101922),(14,"Jabalpur",827,2703,232040),(15,"Kanpur",673,1261,137295),
        (16,"Kolkata",767,3060,57614),(17,"Mumbai",50,695,64921),(18,"Nagpur",62,204,18939),
        (19,"Patna",440,1536,105349),(20,"Raipur",455,1631,176967),
    ]
    contract_rows = [{
        "source_record_id": str(n), "report_year": "2020-21", "region": region,
        "sphere": "Central", "principal_employer_registrations": employers,
        "contractor_licenses_issued": licenses, "contract_labourers_covered_by_licenses": workers,
        "record_type": "published_region_aggregate", "source": "Rajya Sabha Unstarred Question 1373 Annexure",
        "source_url": "https://sansad.in/getFile/annex/255/AU1373.pdf?source=pqars",
        "note": "Aggregate regional count; no contractor or worker identities"
    } for n, region, employers, licenses, workers in contract_stats]
    contract_rows.append({
        "source_record_id": "TOTAL", "report_year": "2020-21", "region": "All reported regions",
        "sphere": "Central", "principal_employer_registrations": 9613,
        "contractor_licenses_issued": 41130, "contract_labourers_covered_by_licenses": 2430989,
        "record_type": "published_national_total", "source": "Rajya Sabha Unstarred Question 1373 Annexure",
        "source_url": "https://sansad.in/getFile/annex/255/AU1373.pdf?source=pqars",
        "note": "Published total from the annexure; no contractor or worker identities"
    })
    pd.DataFrame(contract_rows).to_csv(OUT / "contract_labour_statistics_2020_21.csv", index=False)

    # Create explicitly synthetic profiles/pairs from the source taxonomy.
    rng = random.Random(SEED)
    valid_codes = [c for c in occupations["O*NET-SOC Code"] if len(skill_by_occ.get(c, [])) >= 4]
    workers = []
    for i in range(1000):
        code = rng.choice(valid_codes)
        all_skills = [x[0] for x in skill_by_occ[code][:10]]
        chosen = sorted(rng.sample(all_skills, min(len(all_skills), rng.randint(3, min(7, len(all_skills))))))
        workers.append({"worker_id": f"SYN_W_{i+1:06d}", "profile_occupation_code": code,
                        "profile_occupation_title": title_by_code[code], "worker_skills": "; ".join(chosen),
                        "profile_origin": "synthetic from O*NET skill taxonomy", "is_real_person": False,
                        "source": "O*NET Database 31.0", "source_record_id": code})
    jobs = []
    for i in range(500):
        code = rng.choice(valid_codes)
        all_skills = [x[0] for x in skill_by_occ[code][:10]]
        chosen = sorted(rng.sample(all_skills, min(len(all_skills), rng.randint(3, min(6, len(all_skills))))))
        jobs.append({"job_id": f"SYN_J_{i+1:06d}", "occupation_code": code,
                     "job_title": title_by_code[code], "required_skills": "; ".join(chosen),
                     "job_origin": "synthetic role derived from O*NET occupation", "is_real_vacancy": False,
                     "source": "O*NET Database 31.0", "source_record_id": code})
    pd.DataFrame(workers).to_csv(OUT / "synthetic_worker_profiles.csv", index=False)
    pd.DataFrame(jobs).to_csv(OUT / "synthetic_job_profiles.csv", index=False)

    # Unique worker/job pairs with repeated workers and jobs, sampled deterministically.
    pair_count = 5000
    pairs = set()
    while len(pairs) < pair_count:
        pairs.add((rng.randrange(len(workers)), rng.randrange(len(jobs))))
    match_rows = []
    for wi, ji in sorted(pairs):
        w, j = workers[wi], jobs[ji]
        ws = set(w["worker_skills"].split("; "))
        js = set(j["required_skills"].split("; "))
        score = round(100 * len(ws & js) / len(js), 2) if js else 0.0
        label = int(score >= 50)
        match_rows.append({
            "worker_id": w["worker_id"], "worker_skills": w["worker_skills"],
            "worker_profile_occupation_code": w["profile_occupation_code"],
            "worker_profile_occupation_title": w["profile_occupation_title"],
            "job_id": j["job_id"], "job_title": j["job_title"],
            "job_occupation_code": j["occupation_code"], "required_skills": j["required_skills"],
            "skill_overlap_percent": score, "match_label": label,
            "label_source": "rule_generated: skill overlap >= 50%",
            "record_type": "synthetic_matching_example", "worker_is_synthetic": True,
            "job_is_synthetic": True, "match_outcome_is_observed": False,
            "source": "O*NET Database 31.0 taxonomy used to generate profiles",
            "worker_source_record_id": w["source_record_id"], "job_source_record_id": j["source_record_id"],
            "source_url": "https://www.onetcenter.org/database.html",
            "wage_reference": "", "wage_note": "No occupation-level India wage joined; see separate Labour Bureau reference table",
        })
    match_path = ROOT / "labourlink_ai_dataset_v2.csv"
    pd.DataFrame(match_rows).to_csv(match_path, index=False)

    # India construction-focused version: genuine Indian occupation/wage
    # references stay separate from generated people, contractors and labels.
    trade_defs = {
        "construction_labourer": ("9313.9900", "construction workers (for roads, dams, industrial and project construction work & well diggers)", ["material handling", "site cleanup", "loading and unloading", "basic hand tools", "personal protective equipment"]),
        "mason": ("7112.0200", "Mason", ["brick and block laying", "mortar mixing", "plastering", "surface leveling", "masonry tools", "personal protective equipment"]),
        "carpenter": ("7115.0200", "Carpenter", ["shuttering and formwork", "measuring and marking", "timber cutting", "framing", "hand and power tools", "personal protective equipment"]),
        "plumber": ("7126.0101", "Plumbers", ["pipe fitting", "drainage installation", "leak repair", "pressure testing", "plumbing tools", "personal protective equipment"]),
        "electrician": ("7411.0100", "Electrician", ["electrical wiring", "conduit installation", "cable termination", "circuit testing", "electrical safety", "personal protective equipment"]),
        "painter": ("7132.0100", "", ["surface preparation", "paint mixing", "brush and roller application", "protecting finished surfaces", "ladder safety", "personal protective equipment"]),
        "tile_setter": ("7122.0100", "", ["tile cutting", "surface leveling", "tile layout", "adhesive and grout application", "waterproofing", "personal protective equipment"]),
        "welder": ("7212.0301", "", ["arc welding", "metal fabrication", "measuring and marking", "welding equipment", "fire prevention", "personal protective equipment"]),
        "scaffolder": ("7119.0301", "", ["scaffold erection", "scaffold dismantling", "component inspection", "anchoring", "harness use", "work at height safety"]),
        "construction_helper": ("9313.0301", "construction workers (for roads, dams, industrial and project construction work & well diggers)", ["material handling", "site cleanup", "assisting skilled trades", "basic hand tools", "loading and unloading", "personal protective equipment"]),
    }
    occupation_lookup = {r["occupation_code"]: r for r in all_occupations}
    trade_rows = []
    for trade, (code, wage_item, tags) in trade_defs.items():
        occupation = occupation_lookup.get(code, {})
        trade_rows.append({
            "trade_id": trade, "nco_2015_code": code,
            "official_nco_title": occupation.get("occupation_title", ""),
            "nco_group": occupation.get("nco_group", ""),
            "nco_family": occupation.get("nco_family", ""),
            "labour_bureau_wage_item": wage_item,
            "skill_tags": "; ".join(tags),
            "skill_tags_origin": "synthetic prototype mapping; not observed worker skill records",
            "occupation_source": "DGE NCO 2015 catalog",
            "occupation_source_record_id": code,
            "occupation_source_url": "https://dge.gov.in/nat",
        })
    trade_frame = pd.DataFrame(trade_rows)
    trade_frame.to_csv(OUT / "india_construction_trade_reference.csv", index=False)

    construction_wage = wages[wages["Item"].astype(str).str.lower().isin(
        {v[1].lower() for v in trade_defs.values() if v[1]}
    )].copy()
    construction_wage["trade_ids"] = construction_wage["Item"].astype(str).str.lower().map({
        wage_item.lower(): trade for trade, (_, wage_item, _) in trade_defs.items() if wage_item
    })
    construction_wage.to_csv(OUT / "india_construction_wage_references.csv", index=False)

    indian_states_uts = [
        "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana",
        "Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur",
        "Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu",
        "Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Andaman and Nicobar Islands",
        "Chandigarh","Dadra and Nagar Haveli and Daman and Diu","Delhi","Jammu and Kashmir","Ladakh",
        "Lakshadweep","Puducherry",
    ]
    wage_ref: dict[tuple[str, str], dict[str, object]] = {}
    latest_wages = construction_wage.copy()
    latest_wages["_year"] = pd.to_numeric(latest_wages["Year"].astype(str).str.slice(0,4), errors="coerce")
    month_order = {m: i for i, m in enumerate(["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],1)}
    latest_wages["_month"] = latest_wages["Month"].map(month_order).fillna(0)
    for _, row in latest_wages.sort_values(["_year","_month"], ascending=False).iterrows():
        trade = row["trade_ids"]
        state = str(row["State"]).strip().title()
        key = (state, trade)
        if key in wage_ref:
            continue
        numeric = []
        for col in ["Men", "Women"]:
            try:
                numeric.append(float(str(row[col]).replace(",", "")))
            except (TypeError, ValueError):
                pass
        if numeric:
            wage_ref[key] = {"value": round(sum(numeric)/len(numeric),2), "year":row["Year"], "month":row["Month"], "source_record_id":row["source_record_id"]}

    rng3 = random.Random(SEED + 3)
    trade_ids = list(trade_defs)
    workers3 = []
    for i in range(1000):
        trade = rng3.choice(trade_ids)
        code, wage_item, skills_for_trade = trade_defs[trade]
        worker_state = rng3.choice(indian_states_uts)
        chosen = sorted(rng3.sample(skills_for_trade, rng3.randint(2, min(5, len(skills_for_trade)))))
        ref = wage_ref.get((worker_state, trade))
        workers3.append({
            "worker_id":f"SYN_IN_W_{i+1:06d}", "worker_trade":trade, "worker_nco_2015_code":code,
            "worker_trade_title":occupation_lookup.get(code,{}).get("occupation_title",trade.replace("_"," ").title()),
            "worker_skills":"; ".join(chosen), "experience_years":rng3.randint(0,20),
            "home_state_or_ut":worker_state, "can_relocate":rng3.choice([True,False]),
            "source_wage_reference_inr_day":ref["value"] if ref else "",
            "wage_reference_period":f"{ref['month']} {ref['year']}" if ref else "",
            "profile_origin":"synthetic India construction labourer; no real person data",
            "skills_origin":"synthetic trade-tag mapping", "is_real_worker":False,
        })
    contractors3 = []
    jobs3 = []
    for i in range(250):
        state = rng3.choice(indian_states_uts)
        contractor_trade = rng3.choice(trade_ids)
        contractors3.append({
            "contractor_id":f"SYN_IN_C_{i+1:05d}", "contractor_trade_focus":contractor_trade,
            "operating_state_or_ut":state, "business_name":"", "contact_details":"",
            "license_status":"not observed; synthetic contractor profile",
            "profile_origin":"synthetic placeholder; not a real contractor", "is_real_contractor":False,
        })
        for j in range(2):
            trade = contractor_trade
            _, wage_item, _ = trade_defs[trade]
            ref = wage_ref.get((state, trade))
            offered = round(ref["value"] * rng3.uniform(0.9,1.15),2) if ref else ""
            jobs3.append({
                "job_id":f"SYN_IN_J_{i*2+j+1:05d}", "contractor_id":contractors3[-1]["contractor_id"],
                "job_trade":trade, "job_nco_2015_code":trade_defs[trade][0],
                "required_skills":"; ".join(trade_defs[trade][2]), "work_state_or_ut":state,
                "workers_required":rng3.randint(1,30), "offered_daily_wage_inr":offered,
                "wage_reference_inr_day":ref["value"] if ref else "",
                "wage_reference_period":f"{ref['month']} {ref['year']}" if ref else "",
                "source_wage_record_id":ref["source_record_id"] if ref else "",
                "offered_daily_wage_origin":"synthetic variation on Labour Bureau aggregate benchmark" if ref else "synthetic value unavailable; no matching state/trade benchmark",
                "job_origin":"synthetic contractor work request; not a published vacancy",
                "is_real_vacancy":False,"contractor_is_real":False,
            })
    pd.DataFrame(workers3).to_csv(OUT / "synthetic_india_construction_workers_v3.csv", index=False)
    pd.DataFrame(contractors3).to_csv(OUT / "synthetic_india_construction_contractors_v3.csv", index=False)
    pd.DataFrame(jobs3).to_csv(OUT / "synthetic_india_construction_jobs_v3.csv", index=False)

    pairs3 = {(i, rng3.randrange(len(jobs3))) for i in range(len(workers3))}
    while len(pairs3) < 5000:
        pairs3.add((rng3.randrange(len(workers3)), rng3.randrange(len(jobs3))))
    construction_rows = []
    for wi, ji in sorted(pairs3):
        worker, job = workers3[wi], jobs3[ji]
        worker_skills = set(worker["worker_skills"].split("; "))
        required = set(job["required_skills"].split("; "))
        overlap = round(100 * len(worker_skills & required) / len(required),2) if required else 0
        trade_fit = worker["worker_trade"] == job["job_trade"] or worker["worker_trade"] in {"construction_labourer","construction_helper"}
        location_fit = worker["home_state_or_ut"] == job["work_state_or_ut"] or worker["can_relocate"]
        label = int(trade_fit and overlap >= 40 and location_fit)
        construction_rows.append({
            "worker_id":worker["worker_id"], "worker_trade":worker["worker_trade"],
            "worker_nco_2015_code":worker["worker_nco_2015_code"], "worker_skills":worker["worker_skills"],
            "experience_years":worker["experience_years"], "home_state_or_ut":worker["home_state_or_ut"],
            "can_relocate":worker["can_relocate"], "contractor_id":job["contractor_id"], "job_id":job["job_id"],
            "job_trade":job["job_trade"], "job_nco_2015_code":job["job_nco_2015_code"],
            "required_skills":job["required_skills"], "work_state_or_ut":job["work_state_or_ut"],
            "workers_required":job["workers_required"], "offered_daily_wage_inr":job["offered_daily_wage_inr"],
            "wage_reference_inr_day":job["wage_reference_inr_day"], "wage_reference_period":job["wage_reference_period"],
            "source_wage_record_id":job["source_wage_record_id"], "skill_overlap_percent":overlap,
            "match_label":label,
            "label_source":"synthetic rule: compatible trade AND skill overlap >= 40% AND (same state OR willingness to relocate)",
            "record_type":"synthetic_india_construction_match", "worker_is_synthetic":True,
            "contractor_is_synthetic":True, "vacancy_is_synthetic":True, "outcome_is_observed":False,
            "occupation_reference_source":"DGE NCO 2015", "wage_reference_source":"Labour Bureau rural wages when state/trade data exists",
        })
    pd.DataFrame(construction_rows).to_csv(ROOT / "labourlink_ai_construction_matching_v3.csv", index=False)

    # Small machine-readable provenance manifest and dataset composition summary.
    counts = {
        "downloaded_onet_occupation_rows": len(occupations),
        "downloaded_onet_essential_skill_rating_rows": len(skills),
        "downloaded_onet_task_rows": len(tasks),
        "downloaded_onet_related_occupation_rows": len(related_rows),
        "processed_occupational_records": len(occ_records),
        "downloaded_dge_nco_2015_catalog_records": len(nco_records),
        "processed_dge_nco_2015_occupation_records": len(nco_records),
        "processed_all_source_occupation_records": len(all_occupations),
        "downloaded_labour_bureau_rural_wage_rows": len(wages),
        "processed_labour_bureau_rural_wage_rows": len(wages),
        "processed_contract_labour_region_aggregate_rows": len(contract_stats),
        "processed_contract_labour_published_total_rows": 1,
        "processed_india_construction_trade_reference_records": len(trade_rows),
        "processed_india_construction_wage_reference_records": len(construction_wage),
        "india_construction_wage_reference_states": int(construction_wage["State"].nunique()),
        "genuine_job_vacancy_records": 0,
        "genuine_worker_records": 0,
        "genuine_contractor_profile_records": 0,
        "actual_matching_outcomes": 0,
        "synthetic_worker_profiles": len(workers),
        "synthetic_job_profiles": len(jobs),
        "synthetic_matching_examples": len(match_rows),
        "rule_generated_labels": len(match_rows),
        "rule_generated_positive_labels": sum(r["match_label"] == 1 for r in match_rows),
        "rule_generated_negative_labels": sum(r["match_label"] == 0 for r in match_rows),
        "synthetic_india_construction_worker_profiles": len(workers3),
        "synthetic_india_construction_contractor_profiles": len(contractors3),
        "synthetic_india_construction_job_records": len(jobs3),
        "synthetic_india_construction_matching_examples": len(construction_rows),
        "synthetic_india_construction_rule_labels": len(construction_rows),
        "synthetic_india_construction_positive_labels": sum(r["match_label"] == 1 for r in construction_rows),
        "synthetic_india_construction_negative_labels": sum(r["match_label"] == 0 for r in construction_rows),
    }
    (OUT / "dataset_counts.json").write_text(json.dumps(counts, indent=2), encoding="utf-8")
    print(json.dumps(counts, indent=2))


if __name__ == "__main__":
    main()
