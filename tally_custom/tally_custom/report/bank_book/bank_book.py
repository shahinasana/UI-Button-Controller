import frappe
from frappe.utils import flt, getdate

def execute(filters=None):
    filters = filters or {}

    if not filters.get("from_date") or not filters.get("to_date"):
        frappe.throw("Please select From Date and To Date")

    columns = get_columns()
    data = []

    # Get Bank Accounts
    bank_accounts = frappe.get_all(
        "Account",
        filters={
            "account_type": "Bank",
            "is_group": 0
        },
        pluck="name"
    )

    if not bank_accounts:
        return columns, []

    # Opening Balance
    opening_balance = get_opening_balance(bank_accounts, filters)
    running_balance = opening_balance

    # Opening row
    data.append({
        "posting_date": filters.get("from_date"),
        "particulars": "Opening Balance",
        "balance": running_balance
    })

    gl_entries = frappe.db.sql("""
        SELECT
            posting_date,
            voucher_type,
            voucher_no,
            party_type,
            party,
            debit,
            credit
        FROM `tabGL Entry`
        WHERE
            account IN %(accounts)s
            AND posting_date BETWEEN %(from_date)s AND %(to_date)s
            AND is_cancelled = 0
        ORDER BY posting_date, creation
    """, {
        "accounts": bank_accounts,
        "from_date": filters.get("from_date"),
        "to_date": filters.get("to_date")
    }, as_dict=True)

    for row in gl_entries:
        receipt = flt(row.debit)
        payment = flt(row.credit)

        running_balance += receipt
        running_balance -= payment

        data.append({
            "posting_date": row.posting_date,
            "voucher_type": row.voucher_type,
            "voucher_no": row.voucher_no,
            "particulars": row.party or "",
            "receipt": receipt,
            "payment": payment,
            "balance": running_balance
        })

    return columns, data


def get_opening_balance(accounts, filters):
    result = frappe.db.sql("""
        SELECT
            SUM(debit - credit) AS balance
        FROM `tabGL Entry`
        WHERE
            account IN %(accounts)s
            AND posting_date < %(from_date)s
            AND is_cancelled = 0
    """, {
        "accounts": accounts,
        "from_date": filters.get("from_date")
    }, as_dict=True)

    return flt(result[0].balance) if result else 0


def get_columns():
    return [
        {
            "label": "Date",
            "fieldname": "posting_date",
            "fieldtype": "Date",
            "width": 100
        },
        {
            "label": "Particulars",
            "fieldname": "particulars",
            "fieldtype": "Data",
            "width": 200
        },
        {
            "label": "Voucher Type",
            "fieldname": "voucher_type",
            "fieldtype": "Data",
            "width": 120
        },
        {
            "label": "Voucher No",
            "fieldname": "voucher_no",
            "fieldtype": "Dynamic Link",
            "options": "voucher_type",
            "width": 140
        },
        {
            "label": "Receipt",
            "fieldname": "receipt",
            "fieldtype": "Currency",
            "width": 120
        },
        {
            "label": "Payment",
            "fieldname": "payment",
            "fieldtype": "Currency",
            "width": 120
        },
        {
            "label": "Balance",
            "fieldname": "balance",
            "fieldtype": "Currency",
            "width": 140
        }
    ]
