# Bank Masterfile Module Requirements

## 1. Module Name
**Bank Masterfile Module**

## 2. Purpose
The Bank Masterfile module is used to maintain company bank accounts. It stores bank details, branch, account number, account code, currency, check series, and status.

When a new bank record is created, the system must automatically create a corresponding **Chart of Accounts** record using the existing Chart of Accounts module. The created account must be placed under the existing **Cash in Bank** group.

---

## 3. Database Fields

### Table: `BankMasterfile`

| Field | Data Type | Required | Description |
|---|---:|---:|---|
| ID | int IDENTITY(1,1) | Yes | Primary key of the bank record |
| Bank | nvarchar(50) | No | Name of the bank |
| Branch | nvarchar(50) | No | Bank branch name/location |
| AccountCode | nvarchar(50) | No | Account code linked to Chart of Accounts |
| AccountNumber | nvarchar(50) | No | Bank account number |
| Type | nvarchar(50) | No | Bank account type, e.g. Savings, Current, Checking |
| SeriesStart | nvarchar(50) | No | Starting check series number |
| SeriesEnd | nvarchar(50) | No | Ending check series number |
| SeriesDigits | int | No | Number of digits used in check series formatting |
| Status | nvarchar(50) | No | Active or Inactive |
| DateCreated | datetime | No | Date and time the record was created |
| DateModified | datetime | No | Date and time the record was last modified |
| WhoCreated | nvarchar(50) | No | User who created the record |
| WhoModified | nvarchar(50) | No | User who last modified the record |
| AccountName | nvarchar(250) | No | Bank account name |
| Currency_Type | nvarchar(50) | No | Currency type, e.g. PHP, USD |
| Currency_ExRate | decimal(18,2) | No | Currency exchange rate |

---

## 4. Main Features

### 4.1 Create Bank
Users must be able to create a new bank record by entering the required bank details.

#### Expected behavior
- Save the bank information in the Bank Masterfile table.
- Set default status to **Active** if no status is provided.
- Auto-fill audit fields:
  - `DateCreated`
  - `WhoCreated`
- Automatically create a corresponding Chart of Accounts record through the existing Chart of Accounts module/service.
- The created Chart of Accounts record must be under the existing **Cash in Bank** group.
- Link the created Chart of Accounts code back to `AccountCode`.

---

### 4.2 Auto-create Chart of Accounts
When a bank record is created, the system must automatically create a specific Chart of Accounts entry using the existing **Chart of Accounts** module.

#### Required Chart of Accounts placement
The created Chart of Accounts record must be created **under the existing Cash in Bank group**.

The system must not create a new account group for every bank. It must search for and use the existing **Cash in Bank** parent/group account in the Chart of Accounts module.

#### Suggested Chart of Accounts details
| Field | Suggested Value |
|---|---|
| Parent / Group Account | Existing **Cash in Bank** group |
| Account Code | Auto-generated under the Cash in Bank numbering/code rule, or based on configured bank account code series |
| Account Name | Bank + Branch + Account Number, or use `AccountName` if available |
| Account Type | Asset |
| Account Group | Cash in Bank |
| Currency | Same as `Currency_Type` |
| Status | Active |

#### Example Account Name Format
```text
Cash in Bank - BDO - Makati Branch - 1234567890
```

#### Chart of Accounts creation rules
- Use the existing Chart of Accounts module/service to create the COA record.
- Find the existing **Cash in Bank** group/account first.
- The new bank COA must be created as a child/sub-account under **Cash in Bank**.
- Do not create the bank COA under Cash on Hand, Accounts Receivable, Other Current Assets, or any other group.
- Do not create a duplicate **Cash in Bank** group if it already exists.
- If the **Cash in Bank** group cannot be found, stop the process and return a validation error.
- If `AccountCode` is manually entered, validate that it does not already exist in Chart of Accounts.
- If `AccountCode` is blank, generate a new Chart of Accounts code under the Cash in Bank group based on the configured COA numbering rule.
- Prevent duplicate Chart of Accounts records for the same bank account.
- If Chart of Accounts creation fails, the bank creation must also fail or rollback.

#### Suggested validation error
```text
Cannot create bank account. Cash in Bank group was not found in Chart of Accounts.
Please set up the Cash in Bank group first.
```

---

### 4.3 Edit Bank
Users must be able to edit an existing bank record.

#### Editable fields
- Bank
- Branch
- AccountName
- AccountNumber
- Type
- SeriesStart
- SeriesEnd
- SeriesDigits
- Currency_Type
- Currency_ExRate
- Status

#### Expected behavior
- Update bank information.
- Auto-fill audit fields:
  - `DateModified`
  - `WhoModified`
- If bank name, branch, or account name changes, update the linked Chart of Accounts name if allowed by company settings.
- `AccountCode` should not be freely changed if transactions already exist.

---

### 4.4 Inactive Bank
Users must be able to mark a bank as **Inactive**.

#### Expected behavior
- The bank record must not be deleted.
- Set `Status = 'Inactive'`.
- Inactive banks must not be selectable in new transactions.
- Existing transactions using the inactive bank must remain valid for historical reports.
- Optionally mark the linked Chart of Accounts as inactive if no active bank or transaction dependency requires it.

---

## 5. Validation Rules

| Validation | Rule |
|---|---|
| Bank | Should not be empty when creating a bank |
| AccountNumber | Should be unique per bank and branch |
| AccountCode | Must be unique in Chart of Accounts |
| Currency_Type | Required if multi-currency is enabled |
| Currency_ExRate | Must be greater than 0 if currency is not PHP/base currency |
| SeriesDigits | Must be numeric and greater than 0 if check series is used |
| SeriesStart / SeriesEnd | SeriesStart should not be greater than SeriesEnd |
| Status | Allowed values: Active, Inactive |

---

## 6. Suggested UI Fields

### Bank Information
- Bank
- Branch
- Account Name
- Account Number
- Account Type
- Currency Type
- Currency Exchange Rate

### Check Series Information
- Series Start
- Series End
- Series Digits

### System Information
- Account Code
- Status
- Date Created
- Created By
- Date Modified
- Modified By

---

## 7. User Permissions

| Action | Permission |
|---|---|
| View Bank Masterfile | Bank Masterfile - View |
| Create Bank | Bank Masterfile - Create |
| Edit Bank | Bank Masterfile - Edit |
| Inactive Bank | Bank Masterfile - Inactive |

---

## 8. Transaction Rules

- Active banks can be used in transactions.
- Inactive banks cannot be used in new transactions.
- Banks with existing transactions cannot be deleted.
- AccountCode linked to existing transactions should be locked or restricted from editing.
- Chart of Accounts must stay synchronized with the bank masterfile where applicable.

---

## 9. Recommended Backend Flow

### Create Bank Flow
1. Validate bank input.
2. Check duplicate bank account.
3. Begin database transaction.
4. Find the existing **Cash in Bank** group in the Chart of Accounts module.
5. Create or generate the Chart of Accounts record as a child/sub-account under **Cash in Bank**.
6. Save bank record with linked `AccountCode`.
7. Commit transaction.
8. Return created bank record.

### Edit Bank Flow
1. Validate bank exists.
2. Validate editable fields.
3. Check if `AccountCode` is locked by existing transactions.
4. Update bank record.
5. Update linked Chart of Accounts name if applicable.
6. Return updated bank record.

### Inactive Bank Flow
1. Validate bank exists.
2. Check if bank can be inactivated.
3. Set status to `Inactive`.
4. Prevent the bank from appearing in new transaction selection lists.
5. Return updated bank record.

---

## 10. Notes

- Deleting bank records is not recommended. Use **Inactive** instead.
- Chart of Accounts creation should be handled in the same database transaction as bank creation.
- The Chart of Accounts record created from Bank Masterfile must always be under the existing **Cash in Bank** group.
- The system should keep historical transactions intact even if the bank becomes inactive.
- Company-specific account code series should be considered before finalizing auto-generated AccountCode rules.
