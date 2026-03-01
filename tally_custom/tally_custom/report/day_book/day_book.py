import frappe
from frappe.utils import flt

def execute(filters=None):
    columns = get_columns()
    data = get_data(filters)
    return columns, data


def get_columns():
    return [
        {"label": "Date", "fieldname": "posting_date", "fieldtype": "Date", "width": 90},
        {"label": "Voucher Type", "fieldname": "voucher_type", "fieldtype": "Data", "width": 120},
        {"label": "Voucher No", "fieldname": "voucher_no", "fieldtype": "Dynamic Link",
         "options": "voucher_type", "width": 160},
        {"label": "Party", "fieldname": "party", "fieldtype": "Data", "width": 150},
        {"label": "Debit", "fieldname": "debit", "fieldtype": "Currency", "width": 120},
        {"label": "Credit", "fieldname": "credit", "fieldtype": "Currency", "width": 120},
        {"label": "Balance", "fieldname": "balance", "fieldtype": "Currency", "width": 130}
    ]


def get_data(filters):
    conditions = ""

    if filters.get("from_date"):
        conditions += " AND posting_date >= %(from_date)s"
    if filters.get("to_date"):
        conditions += " AND posting_date <= %(to_date)s"

    gl_entries = frappe.db.sql(f"""
        SELECT
            posting_date,
            voucher_type,
            voucher_no,
            party,
            debit,
            credit
        FROM `tabGL Entry`
        WHERE
            is_cancelled = 0
            {conditions}
        ORDER BY posting_date, creation
    """, filters or {}, as_dict=True)

    running_balance = 0
    data = []

    for row in gl_entries:
        running_balance += flt(row.debit) - flt(row.credit)

        row.voucher_type = map_voucher_type(row.voucher_type, row.voucher_no)
        row.balance = running_balance

        data.append(row)

    return data


def map_voucher_type(voucher_type, voucher_no):
    if voucher_type == "Payment Entry":
        payment_type = frappe.db.get_value(
            "Payment Entry", voucher_no, "payment_type", cache=True
        )
        return "Receipt" if payment_type == "Receive" else "Payment"

    mapping = {
        "Sales Invoice": "Sales",
        "Purchase Invoice": "Purchase",
        "Journal Entry": "Journal"
    }

    return mapping.get(voucher_type, voucher_type)
