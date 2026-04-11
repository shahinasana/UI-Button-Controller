import frappe

def sync_user_company_permissions(doc, method=None):

    allowed_companies = set()
    for row in doc.custom_allowed_companies:
        if row.company:
            allowed_companies.add(row.company)

    existing_permissions = frappe.get_all(
        "User Permission",
        filters={
            "user": doc.name,
            "allow": "Company"
        },
        fields=["name", "for_value"]
    )

    existing_companies = set([p.for_value for p in existing_permissions])

    for company in allowed_companies - existing_companies:
        frappe.get_doc({
            "doctype": "User Permission",
            "user": doc.name,
            "allow": "Company",
            "for_value": company,
            "apply_to_all_doctypes": 1
        }).insert(ignore_permissions=True)

    for perm in existing_permissions:
        if perm.for_value not in allowed_companies:
            frappe.delete_doc("User Permission", perm.name, ignore_permissions=True)