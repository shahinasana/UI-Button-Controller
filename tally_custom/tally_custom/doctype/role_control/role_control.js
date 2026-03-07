frappe.ui.form.on('Role Control', {
    
    refresh: function(frm) {
        
        
        var labelLower="<"
        let $target = $("button").filter(function() {
            return $(this).attr('data-original-title') && 
                $(this).attr('data-original-title').toLowerCase() === labelLower;
        });

        $target.addClass('navbar').hide();  // Add the class to hide the button and use hide()
        frm.doc.hidden_form_buttons?.forEach(row => {
            set_button_options(frm, row.doctype, row.name);
        });
    }
});

frappe.ui.form.on('UI Button Control', {
    // Correct trigger for adding a row
    hidden_form_buttons_add: function(frm, cdt, cdn) {
        set_button_options(frm, cdt, cdn);
    },

    reference_doctype: function(frm, cdt, cdn) {
        frappe.model.set_value(cdt, cdn, "button_label", "");
        set_button_options(frm, cdt, cdn);
    },

    from_menu: function(frm, cdt, cdn) 
    {
        let row = locals[cdt][cdn];
        // If they try to uncheck from_menu AND hide_icon is already unchecked
        if(row.button_location =="Form")
        {
            if (!row.from_menu) {
                frappe.model.set_value(cdt, cdn, "hide_icon", 1);
            }
        }
        
    },

    hide_icon: function(frm, cdt, cdn) 
    {
        let row = locals[cdt][cdn];
        // If they try to uncheck hide_icon AND from_menu is already unchecked
        if(row.button_location =="Form")
            {
                if (!row.hide_icon) {
                    frappe.model.set_value(cdt, cdn, "from_menu", 1);
                }
            }
        
       
    },
});

function set_button_options(frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    
    let standard_buttons = ["...", "Save", "Submit", "Cancel", "Amend", "Update", "Print", "Email", "Duplicate", "Rename", "Delete", "<", ">"];

    const update_grid_ui = (btns) => {
        const buttons = [...new Set(btns)].sort();
        const options = ["", ...buttons].join("\n");

        const grid = frm.fields_dict.hidden_form_buttons.grid;
        const grid_row = grid.get_row(cdn);

        if (grid_row) {
            // Find the field in the specific row's docfields
            const df = frappe.utils.filter_dict(grid_row.docfields, { fieldname: "button_label" })[0];
            if (df) {
                df.options = options;
                // REFRESH FIX: Refresh the specific field on the row
                grid_row.refresh_field("button_label");
            }
        }
    };

    if (row.reference_doctype) {
        frappe.model.with_doctype(row.reference_doctype, function () {
            const meta = frappe.get_meta(row.reference_doctype);
            let current_btns = [...standard_buttons];
            if (meta?.workflow) {
                current_btns.push("Workflow Action");
            }
            update_grid_ui(current_btns);
        });
    } else {
        // Load default buttons immediately if no doctype is selected
        update_grid_ui(standard_buttons);
    }
}

function handle_print_checkbox_logic(frm, cdt, cdn) {
    let row = locals[cdt][cdn];

    // If both individual options are checked, automatically check "Hide Both"
    if (row.from_menu && row.hide_icon) {
        frappe.model.set_value(cdt, cdn, "hide_both", 1);
    } 
    // If one is unchecked, "Hide Both" must be unchecked
    else if (!row.from_menu || !row.hide_icon) {
        frappe.model.set_value(cdt, cdn, "hide_both", 0);
    }
}