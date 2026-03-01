import frappe

@frappe.whitelist()
def get_role_controls():
    user = frappe.session.user
    # Get roles directly from the User document
    user_doc = frappe.get_doc("User", user)
    roles = [r.role for r in user_doc.roles]
    
    company = frappe.defaults.get_user_default("Company")

    controls = frappe.get_all(
        "Role Control",
        filters={"enabled": 1},
        fields=[
            "name", "role", "user", "company", "enabled",
            "hide_awesome_bar", "hide_help_menu",
            "hide_sidebar", "hide_customize_menu"
        ],
        order_by="priority desc"
    )

    matched = []
    
    print(f"User: {user}, Roles: {roles}, Company: {company}")  # Debug log

    for ctrl in controls:
        print(f"Checking control: {ctrl.name}, Role: {ctrl.role}, User: {ctrl.user}, Company: {ctrl.company}")
        
        # If no filters are set, this control applies to everyone
        if not ctrl.role and not ctrl.user and not ctrl.company:
            matched.append(ctrl)
            continue
            
        # Check role match
        if ctrl.role:
            if ctrl.role in roles:
                matched.append(ctrl)
                continue
            # If role doesn't match but other filters exist, continue checking
            if ctrl.user or ctrl.company:
                continue
            else:
                continue
        
        # Check user match
        if ctrl.user:
            if ctrl.user == user:
                matched.append(ctrl)
                continue
            # If user doesn't match but company filter exists, continue checking
            if ctrl.company:
                continue
            else:
                continue
        
        # Check company match
        if ctrl.company:
            if ctrl.company == company:
                matched.append(ctrl)
                continue

    if not matched:
        return {}

    # Get the highest priority matched control (first in list)
    rule = matched[0]
    doc = frappe.get_doc("Role Control", rule.name)

    return {
        "name": doc.name,
        "role": doc.role,
        "user": doc.user,
        "company": doc.company,
        "enabled": doc.enabled,
        "flags": {
            "hide_awesome_bar": doc.hide_awesome_bar,
            "hide_help_menu": doc.hide_help_menu,
            "hide_sidebar": doc.hide_sidebar,
            "hide_customize_menu": doc.hide_customize_menu,
            "enabled": doc.enabled,
        },
        "hidden_form_buttons": doc.hidden_form_buttons,
        "hidden_desk_menus": doc.hidden_desk_menus,
    }


import frappe

@frappe.whitelist()
def get_doctype_buttons(doctype):
    buttons = []

    # Standard buttons
    buttons.extend(["Save", "Submit", "Cancel", "..."])

    # Workflow actions
    workflows = frappe.get_all("Workflow",
        filters={"document_type": doctype},
        pluck="name"
    )

    if workflows:
        buttons.append("Workflow Actions")

    # You can add more known buttons
    buttons.append("Get Items From")

    return sorted(set(buttons))

