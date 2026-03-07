

frappe.dom.set_style(`
    .hide-help-menu {
        display: none !important;
    }
    `);

if (!window._zero_blink_style_id) {

    window._zero_blink_style_id = "role-control-zero-blink";

frappe.dom.set_style(`
    .zero-blink .form-inner-toolbar,
    .zero-blink .list-view-actions {
        opacity:0 !important;
    }
    `);

}

$('.page-container').addClass('zero-blink');

$(document).ready(function () {
    apply_role_control();
});

frappe.router.on('change', () => {

    window.isHidingApplied = false;

    $('.page-container').addClass('zero-blink');

    if (window._buttonObserver) {
        window._buttonObserver.disconnect();
    }

    apply_role_control();

});

frappe.ui.form.on('*', {
    refresh(frm) {

        if (!window.role_control_cfg) return;

        const route = frappe.get_route();
        const currentView = route ? route[0] : null;

        if (!currentView) return;

        applyButtonRules(
            window.role_control_cfg,
            currentView === "Form" ? cur_frm : cur_list,
            currentView
        );
    }
});



window.role_control_cfg = null;
window._roleControlLoaded = false;
window._roleControlCache = null;
window.isHidingApplied = false;

async function loadRoleControlOnce() {

    if (window._roleControlLoaded) return;

    const r = await frappe.call({
        method: "tally_custom.tally_custom.api.role_control.get_role_controls"
    });

    if (!r.message) return;

    window._roleControlCache = Array.isArray(r.message)
        ? r.message
        : [r.message];

    window._roleControlLoaded = true;
}

async function doesRoleControlApply(config) {

    const currentUser = frappe.session.user;
    const userRoles = frappe.user_roles || [];
    const currentCompany = frappe.defaults.get_default("company");

    if (config.users && config.users.length) {
        const userMatch = config.users.some(u => u.user === currentUser);
        if (!userMatch) return false;
    }

    if (config.roles && config.roles.length) {
        const roleMatch = config.roles.some(r => userRoles.includes(r.role));
        if (!roleMatch) return false;
    }

    if (config.allowed_companies && config.allowed_companies.length) {
        const companyMatch = config.allowed_companies.some(c => c.company === currentCompany);
        if (!companyMatch) return false;
    }

    return true;
}

function mergeRoleControls(configs) {

    const merged = {
        flags: {},
        hidden_form_buttons: [],
        hidden_desk_menus: []
    };

    configs.forEach(cfg => {

        if (cfg.flags) {
            Object.keys(cfg.flags).forEach(key => {
                if (cfg.flags[key]) merged.flags[key] = cfg.flags[key];
            });
        }

        if (cfg.hidden_form_buttons) {
            merged.hidden_form_buttons.push(...cfg.hidden_form_buttons);
        }

        if (cfg.hidden_desk_menus) {
            merged.hidden_desk_menus.push(...cfg.hidden_desk_menus);
        }

    });

    return merged;
}

async function apply_role_control() {

    await loadRoleControlOnce();

    const allConfigs = window._roleControlCache;

    if (!allConfigs || !allConfigs.length) {
        window.role_control_cfg = null;
        return;
    }

    const validConfigs = [];

    for (const config of allConfigs) {

        if (!config) continue;
        if (!config.flags || config.flags.enabled !== 1) continue;

        const applies = await doesRoleControlApply(config);

        if (applies) validConfigs.push(config);
    }

    if (!validConfigs.length) {
        window.role_control_cfg = null;
        return;
    }

    const cfg = mergeRoleControls(validConfigs);
    window.role_control_cfg = cfg;
    
    applyGlobalFlags(cfg);
    hideDeskSidebarItems(cfg.hidden_desk_menus || []);
    observeAndApplyButtons(cfg);
    waitForFormAndApply(cfg);
}

function hide_sidebar() {

    const sidebar = document.querySelector('.desk-sidebar');

    if (!sidebar) return;

    sidebar.classList.add('hide-desk-sidebar');
}

function show_sidebar() {

    const sidebar = document.querySelector('.desk-sidebar');

    if (!sidebar) return;

    sidebar.classList.remove('hide-desk-sidebar');
}

function waitForFormAndApply(cfg) {

    let attempts = 0;

    const checkForm = setInterval(() => {

        attempts++;

        if (cur_frm && cur_frm.page && cur_frm.doc) {

            clearInterval(checkForm);

            const route = frappe.get_route();
            const currentView = route ? route[0] : null;

            applyButtonRules(cfg, cur_frm, currentView);
            setTimeout(() => {
                window.isHidingApplied = true;
                removeZeroBlink();
            }, 100);

        }

        if (attempts > 40) {
            clearInterval(checkForm);
        }

    }, 150);

}

function applyButtonRules(cfg, viewObj, currentView) {

    if (!cfg?.hidden_form_buttons?.length) return;

    [0, 120, 350, 700, 1200].forEach((delay, index) => {

        setTimeout(() => {

            const route = frappe.get_route();
            const view = route ? route[0] : null;

            let viewObjNow = null;

            if (view === "Form") {
                if (!cur_frm || !cur_frm.page) {
                    return;
                }
                viewObjNow = cur_frm;
            }

            if (view === "List") {
                viewObjNow = cur_list;
            }

            enforce_button_rules(cfg, viewObjNow, view);
            if (index === 4) 
            {

                window.isHidingApplied = true;
            
                setTimeout(() => {
                    removeZeroBlink();
                }, 20);
            
            }
        }, delay);

    });

}

function applyGlobalFlags(cfg) {

    if (!cfg) return;

                if (cfg.flags?.hide_help_menu) {
                $('.dropdown-help').addClass('hide-help-menu');
            } else {
                $('.dropdown-help').removeClass('hide-help-menu');
            }

            if (cfg.flags?.hide_awesome_bar) {
                $(".awesome-bar, .navbar-search, .search-bar").hide();
            }

    if (cfg.flags?.hide_sidebar) {

        frappe.dom.set_style(`
            .layout-side-section,
            .desk-sidebar {
                display:none !important;
            }
        `);

    }

}

function hideDeskSidebarItems(hiddenMenus = []) {

    if (!hiddenMenus.length) return;

    hiddenMenus.forEach(menu => {

        if (!menu.menu_label || menu.hide !== 1) return;

        const route = frappe.router.slug(menu.menu_label);

        frappe.dom.set_style(`
            a[href="/app/${route}"] {
                display:none !important;
            }
        `);
    });
}

function observeAndApplyButtons(cfg) {

    if (!cfg.hidden_form_buttons?.length) return;

    if (window._buttonObserver) {
        window._buttonObserver.disconnect();
    }

    window._buttonObserver = new MutationObserver(() => {
    const route = frappe.get_route();
    const currentView = route ? route[0] : null;

    if (!currentView) return;
    applyButtonRules(cfg, currentView === "Form" ? cur_frm : cur_list, currentView);
    });

    window._buttonObserver.observe(document.body, {
        childList: true,
        subtree: true
    });

    setTimeout(() => {
        if (window._buttonObserver) {
            window._buttonObserver.disconnect();
        }
    
        window.isHidingApplied = true;
        removeZeroBlink();
    
    }, 2000);
    const route = frappe.get_route();
    const currentView = route ? route[0] : null;

    if (!currentView) return;
    applyButtonRules(cfg, currentView === "Form" ? cur_frm : cur_list, currentView);
}


function enforce_button_rules(cfg, viewObj, currentView) 
{
    if (!cfg?.hidden_form_buttons?.length) return;
    let doctype;

    if (currentView === "Form") {
        if (!viewObj) {
            return;
        }
        doctype = viewObj.doctype;
    } else if (currentView === "List") {
        doctype = frappe.get_route()[1];
    } else {
        return;
    }
    executeButtonRules(cfg, doctype, currentView, viewObj);
}

function executeButtonRules(cfg, doctype, currentView, viewObj) {

    cfg.hidden_form_buttons.forEach(row_doc => {
        if (row_doc.reference_doctype && row_doc.reference_doctype !== doctype) {
            return;
        }

        const buttonLocation = (row_doc.button_location || "Both").toLowerCase();

        if (buttonLocation === "form" && currentView !== "Form") return;
        if (buttonLocation === "list" && currentView !== "List") return;

        const label = (row_doc.button_label || row_doc.custom_button_label || "").trim();
        const labelLower = label.toLowerCase();

        if (row_doc.button_label) {
            handle_standard_button(labelLower, row_doc, row_doc.hide_only, currentView === "Form" ? viewObj : null, currentView);
        } else {
            hide_custom_button(label, currentView, buttonLocation);
        }
    });

    if (currentView === "List") {
        cfg.hidden_form_buttons.forEach(row_doc => {
            if (row_doc.reference_doctype && row_doc.reference_doctype !== doctype) return;

            const buttonLocation = (row_doc.button_location || "Both").toLowerCase();
            if (buttonLocation === "list" || buttonLocation === "both") {
                const label = (row_doc.custom_button_label || "").trim();
                if (label && !row_doc.button_label) {
                    $(`.dropdown-menu li a, .dropdown-menu li, .actions-button-group .dropdown-menu li a`)
                        .filter(function() {
                            return $(this).text().trim().toLowerCase().includes(label.toLowerCase());
                        })
                        .addClass('hide-but-active');
                }
            }
        });
    }
}

function handle_standard_button(labelLower, row, hide_only, viewObj, currentView) {
    if (!row || typeof row !== 'object') return;

    const buttonLocation = (row.button_location || "Both").toLowerCase();
    const displayLabel = labelLower.charAt(0).toUpperCase() + labelLower.slice(1);
    const standard_buttons = ["save", "submit", "cancel", "amend", "update", "print", "email", "duplicate", "rename", "delete", "<", ">", "..."];

    if (!standard_buttons.includes(labelLower)) return;

    if (labelLower === "save" || labelLower === "submit") {
        if ((buttonLocation === "form" || buttonLocation === "both") && currentView === "Form") {
            let $btn = $();

            $btn = $(`button[data-label="${displayLabel}"]`);
            if ($btn.length === 0) {
                $btn = $(`.primary-action[data-label="${displayLabel}"]`);
            }
            if ($btn.length === 0) {
                $btn = $(`button:contains("${displayLabel}"), .btn:contains("${displayLabel}")`)
                    .filter(function() {
                        return $(this).text().trim() === displayLabel;
                    });
            }

            if (hide_only == 1) {
                $btn.addClass('hide-but-active');
            } else {
                $btn.removeClass('hide-but-active');
                if (labelLower === "save" && viewObj) {
                    try {
                        viewObj.disable_save();
                    } catch (e) {}
                }
                if (labelLower === "submit" && viewObj) {
                    $btn.addClass('hide-but-active');
                }
            }
        }

        if ((buttonLocation === "list" || buttonLocation === "both") && currentView === "List") {
            const $toolbarBtns = $(`.list-toolbar button:contains("${displayLabel}"), .list-actions button:contains("${displayLabel}")`)
                .filter(function() {
                    return $(this).text().trim() === displayLabel;
                });

            const $menuBtns = $(`.dropdown-menu li a:contains("${displayLabel}"), .dropdown-menu li:contains("${displayLabel}")`)
                .filter(function() {
                    return $(this).text().trim() === displayLabel;
                });

            const $anyBtns = $(`button:contains("${displayLabel}"), .btn:contains("${displayLabel}")`)
                .filter(function() {
                    return $(this).text().trim() === displayLabel;
                });

            const $allListBtns = $toolbarBtns.add($menuBtns).add($anyBtns);

            if (hide_only == 1) {
                $allListBtns.addClass('hide-but-active');
            } else {
                $allListBtns.removeClass('hide-but-active');
            }

            if (labelLower === "submit") {
                $(`.dropdown-menu li a:contains("Submit"), .dropdown-menu li:contains("Submit")`)
                    .closest('li').addClass('hide-but-active');
            }
        }
    } else if (labelLower === "print") {
        if ((buttonLocation === "form" || buttonLocation === "both") && currentView === "Form") {
            if (row.hide_icon == 1) {
                $('button[data-original-title="Print"], button[title="Print"]')
                    .addClass('hide-but-active');
            }
            if (row.from_menu == 1) {
                $(`.dropdown-item [data-label="Print"]`).closest('li')
                    .addClass('hide-but-active');
            }
        }

        if ((buttonLocation === "list" || buttonLocation === "both") && currentView === "List") {
            if (row.hide_icon == 1 || row.from_menu == 1) {
                $(`.dropdown-menu li a:contains("Print"), .dropdown-menu li:contains("Print")`)
                    .closest('li')
                    .addClass('hide-but-active');
                $('button:contains("Print"), .btn:contains("Print")').addClass('hide-but-active');
            }
        }
    } else if (labelLower === "<" || labelLower === ">" || labelLower === "...") {
        if ((buttonLocation === "form" || buttonLocation === "both") && currentView === "Form") {
            if (labelLower === "<") {
                $('button[data-original-title="Previous Document"]').addClass("hide-but-active");
            } else if (labelLower === ">") {
                $('button[data-original-title="Next Document"]').addClass("hide-but-active");
            } else if (labelLower === "...") {
                $('button[data-original-title="Menu"]').addClass("hide-but-active");
            }
        }
    } else {
        let $target = $();

        if ((buttonLocation === "form" || buttonLocation === "both") && currentView === "Form") {
            $target = $(`button[data-label="${displayLabel}"]`);

            if ($target.length === 0) {
                $target = $(`.btn-secondary:contains("${displayLabel}"), .btn-default:contains("${displayLabel}")`)
                    .filter(function() {
                        return $(this).text().trim() === displayLabel;
                    });
            }

            if ($target.length === 0) {
                $target = $(`.menu-item-label`).filter(function() {
                    return $(this).text().trim().toLowerCase() === labelLower;
                }).closest('li');
            }

            if ($target.length === 0) {
                $target = $(`.dropdown-item`).filter(function() {
                    const clone = $(this).clone();
                    clone.find('kbd').remove();
                    return clone.text().trim().toLowerCase() === labelLower;
                }).closest('li');
            }

            if ($target.length === 0) {
                $target = $(`button[title="${displayLabel}"], button[data-original-title="${displayLabel}"]`);
            }

            if ($target.length === 0) {
                $target = $(`button:contains("${displayLabel}"), .btn:contains("${displayLabel}")`)
                    .filter(function() {
                        return $(this).text().trim() === displayLabel;
                    });
            }

            if ($target.length === 0) {
                $target = $(`.form-inner-toolbar button:contains("${displayLabel}"), .page-actions button:contains("${displayLabel}")`)
                    .filter(function() {
                        return $(this).text().trim() === displayLabel;
                    });
            }
        }

        if ((buttonLocation === "list" || buttonLocation === "both") && currentView === "List") {
            $target = $(`.list-toolbar button:contains("${displayLabel}"), .list-actions button:contains("${displayLabel}")`)
                .filter(function() {
                    return $(this).text().trim() === displayLabel;
                });

            if ($target.length === 0) {
                $target = $(`.dropdown-menu li a, .dropdown-menu li`).filter(function() {
                    return $(this).text().trim().toLowerCase() === labelLower;
                }).closest('li');
            }

            if ($target.length === 0) {
                $target = $(`button:contains("${displayLabel}"), .btn:contains("${displayLabel}")`)
                    .filter(function() {
                        return $(this).text().trim() === displayLabel;
                    });
            }
        }

        if ($target.length > 0) {
            $target.addClass('hide-but-active');
        }
    }
}

function hide_custom_button(label, currentView, buttonLocation) {
    const labelLower = label.toLowerCase();

    if (buttonLocation === "form" && currentView !== "Form") {
        return;
    }
    if (buttonLocation === "list" && currentView !== "List") {
        return;
    }

    let viewSpecificSelectors = '';

    if (currentView === "List") {
        viewSpecificSelectors = '.list-toolbar button, .list-actions button, .list-row-check, .list-header button, .actions-btn-group button, .dropdown-menu li a, .btn-group .dropdown-menu li, [data-toggle="dropdown"] + .dropdown-menu li, .actions-button-group .dropdown-menu li';
    } else if (currentView === "Form") {
        viewSpecificSelectors = '.form-inner-toolbar button, .page-actions button, .custom-actions button';
    }

    const dropdownButtons = $('.btn[data-toggle="dropdown"]').filter(function() {
        return $(this).text().trim().toLowerCase().includes(labelLower);
    });

    const dataLabelButtons = $(`button[data-label="${label}"], button[data-label="${labelLower}"]`);

    const textButtons = $('button, .btn').filter(function() {
        return $(this).text().trim().toLowerCase() === labelLower;
    });

    const menuItems = $('.dropdown-menu li a, .dropdown-menu li').filter(function() {
        return $(this).text().trim().toLowerCase().includes(labelLower);
    });

    let viewButtons = $();
    if (viewSpecificSelectors) {
        try {
            viewButtons = $(viewSpecificSelectors).filter(function() {
                return $(this).text().trim().toLowerCase().includes(labelLower);
            });
        } catch (e) {}
    }

    const toolbarButtons = $('.form-inner-toolbar button, .page-actions button').filter(function() {
        return $(this).text().trim().toLowerCase().includes(labelLower);
    });

    const anyButtons = $('.btn').filter(function() {
        return $(this).text().trim().toLowerCase().includes(labelLower);
    });

    if (currentView === "List") {
        const actionsButtons = $('button, .btn').filter(function() {
            const text = $(this).text().trim();
            return text === 'Actions' || text.includes('Actions');
        });

        actionsButtons.each(function() {
            const $actionsBtn = $(this);
            const $dropdownMenu = $actionsBtn.next('.dropdown-menu');

            if ($dropdownMenu.length > 0) {
                $dropdownMenu.find('li a, li').filter(function() {
                    return $(this).text().trim().toLowerCase().includes(labelLower);
                }).addClass('hide-but-active');
            }
        });
    }

    const allButtons = dropdownButtons
        .add(dataLabelButtons)
        .add(textButtons)
        .add(menuItems)
        .add(viewButtons)
        .add(toolbarButtons)
        .add(anyButtons);

    if (allButtons.length > 0) {
        allButtons.addClass('hide-but-active');
    }
}

function removeZeroBlink() {

    if (!window.isHidingApplied) return;

    const container = document.querySelector('.page-container');
    if (!container) return;

    container.classList.remove('zero-blink');

}









