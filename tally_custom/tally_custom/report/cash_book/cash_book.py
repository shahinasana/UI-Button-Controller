import frappe
from frappe import _

def execute(filters=None):
    filters = filters or {}

    columns = get_columns()
    data = get_data(filters)

    return columns, data


def get_columns():
    return [
        {"label": _("Date"), "fieldname": "posting_date", "fieldtype": "Date", "width": 90},
        {"label": _("Voucher Type"), "fieldname": "voucher_type", "width": 120},
        {"label": _("Voucher No"), "fieldname": "voucher_no", "fieldtype": "Dynamic Link", "options": "voucher_type", "width": 150},
        {"label": _("Debit"), "fieldname": "debit", "fieldtype": "Currency", "width": 120},
        {"label": _("Credit"), "fieldname": "credit", "fieldtype": "Currency", "width": 120},
        {"label": _("Running Balance"), "fieldname": "balance", "fieldtype": "Currency", "width": 140}
    ]


def get_data(filters):
    cash_accounts = frappe.get_all(
        "Account",
        filters={"account_type": "Cash", "is_group": 0},
        pluck="name"
    )

    if not cash_accounts:
        return []

    gl_entries = frappe.db.sql(
        """
        SELECT posting_date, voucher_type, voucher_no, debit, credit
        FROM `tabGL Entry`
        WHERE account IN %(accounts)s
          AND posting_date BETWEEN %(from_date)s AND %(to_date)s
          AND is_cancelled = 0
        ORDER BY posting_date, creation
        """,
        {
            "accounts": tuple(cash_accounts),
            "from_date": filters.from_date,
            "to_date": filters.to_date
        },
        as_dict=True
    )

    data = []
    running_balance = 0

    for row in gl_entries:
        running_balance += (row.debit - row.credit)

        data.append({
            "posting_date": row.posting_date,
            "voucher_type": map_voucher_type(row.voucher_type),
            "voucher_no": row.voucher_no,
            "debit": row.debit,
            "credit": row.credit,
            "balance": running_balance
        })

    return data


def map_voucher_type(voucher_type):
    """Rename voucher types like Tally"""
    mapping = {
        "Payment Entry": "Receipt / Payment",
        "Journal Entry": "Journal",
        "Sales Invoice": "Sales",
        "Purchase Invoice": "Purchase"
    }
    return mapping.get(voucher_type, voucher_type)
