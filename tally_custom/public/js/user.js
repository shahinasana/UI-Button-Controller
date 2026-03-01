frappe.ui.form.on('User', {
    refresh: function(frm) {
        if (!frm.is_new()) {
            frm.add_custom_button('Manage Company Access', function() {
                open_company_dialog(frm);
            });
        }
    }
});

function open_company_dialog(frm) {

    frappe.call({
        method: "frappe.client.get_list",
        args: {
            doctype: "User Permission",
            filters: {
                user: frm.doc.name,
                allow: "Company"
            },
            fields: ["name", "for_value"]
        },
        callback: function(r) {

            let existing = r.message || [];

            let dialog = new frappe.ui.Dialog({
                title: "Manage Company Access",
                fields: [
                    {
                        fieldtype: "Table",
                        fieldname: "companies",
                        label: "Allowed Companies",
                        in_place_edit: true,
                        fields: [
                            {
                                fieldtype: "Link",
                                fieldname: "company",
                                options: "Company",
                                in_list_view: 1,
                                reqd: 1
                            }
                        ]
                    }
                ],
                primary_action_label: "Save",
                primary_action(values) {

                    sync_user_permissions(frm, values.companies, existing);
                    dialog.hide();
                }
            });

            // Prefill existing companies
            existing.forEach(row => {
                let child = dialog.fields_dict.companies.grid.add_new_row();
                child.company = row.for_value;
            });

            dialog.show();
        }
    });
}

function sync_user_permissions(frm, new_companies, existing) {

    let existing_names = existing.map(d => d.for_value);
    let new_names = new_companies.map(d => d.company);

    // Add new permissions
    new_names.forEach(company => {
        if (!existing_names.includes(company)) {
            frappe.call({
                method: "frappe.client.insert",
                args: {
                    doc: {
                        doctype: "User Permission",
                        user: frm.doc.name,
                        allow: "Company",
                        for_value: company,
                        apply_to_all_doctypes: 1
                    }
                }
            });
        }
    });

    // Remove deleted permissions
    existing.forEach(row => {
        if (!new_names.includes(row.for_value)) {
            frappe.call({
                method: "frappe.client.delete",
                args: {
                    doctype: "User Permission",
                    name: row.name
                }
            });
        }
    });

    frappe.msgprint("Company access updated successfully.");
}