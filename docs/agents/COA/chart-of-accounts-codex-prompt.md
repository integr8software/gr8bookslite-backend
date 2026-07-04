# Chart of Accounts Auto Code Generation Prompt

I am building a Chart of Accounts module.

Frontend: React JS  
Backend: Node.js + SQL Server  

---

## Account Code Format

A BB CC DD EEE

- A = Major Account Type (1 digit)  
- BB = Sub Account 1 (2 digits)  
- CC = Sub Account 2 (2 digits)  
- DD = Sub Account 3 (2 digits)  
- EEE = Specific Account (3 digits)  

---

## Business Rule

Users can create accounts at any level:

- Major
- Sub1 under Major
- Sub2 under Sub1
- Sub3 under Sub2
- Specific under ANY level (Major/Sub1/Sub2/Sub3)

---

## Core Requirement

Create a function:

generateNextAccountCode(parentAccountCode, accountGroupToCreate)

---

## Rules

### Sub1
Increment BB, reset CC DD EEE

Example:
1010000000 → 1020000000 → 1030000000

---

### Sub2
Increment CC, reset DD EEE

Example:
1010100000 → 1010200000 → 1010300000

---

### Sub3
Increment DD, reset EEE

Example:
1010101000 → 1010102000 → 1010103000

---

### Specific Account
Increment EEE under selected parent

Example:
1010300000
1010300001
1010300002
→ 1010300003

---

## Important Rules

- Must query SQL Server for existing siblings
- Must return NEXT available code
- Must fill gaps (e.g. 1,2,5 → return 3)
- Must prevent duplicates
- Must work for ANY parent level
- Must support React JS frontend via API

---

## Database Table

tblCOA:
- AccountCode
- AccountTitle
- AccountGroup
- ParentAccountCode (recommended)

---

## API Requirement (Node.js)

GET /api/chartofaccounts/next-code

Query:
?parentCode=XXXX&level=Specific

Response:
{
  "accountCode": "1010300003"
}

---

## Output

Generate production-ready Node.js code + SQL queries + logic.
