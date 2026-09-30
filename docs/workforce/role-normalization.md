# Role Normalization & Taxonomy Standard

## 1. Context & Objective
Job titles vary widely across organizations. An individual titled "Staf IT & Publikasi" may perform duties corresponding to six distinct external market roles. 

Role normalization translates internal duties into **standardized market titles** supported by recognized recruitment and statistical salary reports.

---

## 2. Canonical Market Roles Registry

| Role ID | Canonical Title | Category | Alternate Market Titles | Normalized Level | Weekly Hours |
| :--- | :--- | :--- | :--- | :--- | :---: |
| `mkt_web_admin` | Web Administrator | IT Operations | Website Administrator, Webmaster, Site Operator | MID | 40 |
| `mkt_wp_specialist` | WordPress / CMS Specialist | Web Engineering | WordPress Developer, CMS Admin, PHP Webmaster | MID | 40 |
| `mkt_graphic_designer` | Graphic Designer | Creative Design | Visual Designer, Brand Designer, Layout Artist | MID | 40 |
| `mkt_social_media` | Social Media Specialist | Marketing & Comms | Social Media Officer, Community Manager | MID | 40 |
| `mkt_content_spec` | Content Publishing Specialist | Editorial & Admin | Web Content Writer, Decree Formatter, Copywriter | MID | 40 |
| `mkt_it_support` | IT Support Specialist | IT Operations | Helpdesk Technician, Desktop Engineer, LAN Admin | MID | 40 |
| `mkt_fullstack_eng` | Fullstack Software Engineer | Software Engineering | Fullstack Developer, Web Engineer | SENIOR | 40 |
| `mkt_sys_architect` | Systems Architect | Architecture & Core | Principal Architect, Cloud Solutions Architect | PRINCIPAL | 40 |
| `mkt_qa_engineer` | QA & Security Engineer | Quality & Security | Test Automation Engineer, AppSec Analyst | SENIOR | 40 |

---

## 3. Algorithmic Candidate Role Matching
The matching engine evaluates four dimensions:
1. **Title & Alternate Title Similarity** (Weight: 50%): Exact or substring match against canonical and alternate titles.
2. **Skill Overlap** (Weight: 24%): Comparison of responsibility skills against role typical skills.
3. **Tool Overlap** (Weight: 14%): Tooling stack match (e.g. cPanel, Figma, WordPress, Mikrotik).
4. **Description Alignment** (Weight: 12%): Substring match against standard role responsibilities.

Match scores $\ge 0.65$ receive **HIGH** confidence, scores between $0.35$ and $0.64$ receive **MEDIUM** confidence, and scores $< 0.35$ receive **LOW** confidence.
