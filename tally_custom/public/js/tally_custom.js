var hide_help = 0;
window.role_control_cfg = null;
var role_control_applied = false;
let form_button_hooked = false;
let enforce_timeout = null;
let isHidingApplied = false;
let currentUser = null;
let currentUserRoles = null;

frappe.dom.set_style(`
    .hide-but-active {
        opacity: 0 !important;
        pointer-events: none !important;
        width: 0 !important;
        height: 0 !important;
        padding: 0 !important;
        margin: 0 !important;
        overflow: hidden !important;
        position: absolute !important;
    }
`);

(function() {
    const style = document.createElement('style');
    style.id = 'zero-blink-buttons';
    style.textContent = `
        /* Hide all buttons immediately - universal selectors */
        .page-container button,
        .page-container .btn,
        .page-container .primary-action,
        .page-container [data-label],
        .page-container [data-toggle="dropdown"],
        .page-container .dropdown-toggle,
        .form-inner-toolbar button,
        .form-inner-toolbar .btn,
        .page-actions button,
        .page-actions .btn,
        .btn-group button,
        .btn-group .btn,
        [data-original-title] {
            opacity: 0 !important;
            pointer-events: none !important;
            width: 0 !important;
            height: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: hidden !important;
            position: absolute !important;
            display: none !important;
            visibility: hidden !important;
        }
        
        /* Keep navbar and essential UI functional */
        .navbar button,
        .navbar .btn,
        .navbar .dropdown-item,
        .modal button,
        .modal .btn {
            opacity: 1 !important;
            pointer-events: auto !important;
            width: auto !important;
            height: auto !important;
            padding: initial !important;
            margin: initial !important;
            overflow: visible !important;
            position: relative !important;
            display: inline-block !important;
            visibility: visible !important;
        }
    `;
    document.head.appendChild(style);
    window._zero_blink_style_id = 'zero-blink-buttons';
})();

frappe.router.on("change", () => {
    console.log("Route changed, reapplying role control");
    isHidingApplied = false;
    apply_role_control();
});

$(document).on('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        if (shouldDisableSave()) {
            e.preventDefault(); 
            e.stopImmediatePropagation();
        }
    }
});

function shouldDisableSave() {
    if (!window.role_control_cfg?.hidden_form_buttons || !cur_frm) {
        return false;
    }

    const currentDoctype = cur_frm.doctype;
    const currentView = frappe.get_route()[0];
    for (let row_doc of window.role_control_cfg.hidden_form_buttons) 
    {
        if (row_doc.reference_doctype && row_doc.reference_doctype !== currentDoctype) {
            continue;
        }
        if (!row_doc.reference_doctype) {
            continue;
        }
        const buttonLocation = (row_doc.button_location || "Both").toLowerCase();
        if (buttonLocation === "form" && currentView !== "Form") {
            continue;
        }
        if (buttonLocation === "list" && currentView !== "List") {
            continue;
        }
        const label = (row_doc.button_label || "").trim().toLowerCase();

        if (label === "save" && row_doc.hide_only==0) {
            return true;
        }
    }
    return false;
}

// Function to get current user and their roles
function getCurrentUserAndRoles() {
    return new Promise((resolve) => {
        if (currentUser && currentUserRoles) {
            console.log("Using cached user/roles:", currentUser, currentUserRoles);
            resolve({ user: currentUser, roles: currentUserRoles });
            return;
        }

        // Get roles from frappe.user_roles (client-side)
        try {
            // frappe.user_roles is available in the client
            const roles = frappe.user_roles || [];
            console.log("Roles from frappe.user_roles:", roles);
            
            if (roles && roles.length > 0) {
                currentUser = frappe.session.user;
                currentUserRoles = roles;
                console.log("Current user roles:", currentUserRoles);
                resolve({ user: currentUser, roles: currentUserRoles });
                return;
            }
        } catch (e) {
            console.log("Error with frappe.user_roles:", e);
        }

        // Fallback: get user info which might have roles
        frappe.call({
            method: "frappe.client.get",
            args: {
                doctype: "User",
                name: frappe.session.user
            },
            callback: function(r) {
                console.log("User details fetched:", r.message);
                
                if (r.message) {
                    currentUser = r.message.name;
                    
                    // Try to get roles from the user document
                    let roles = [];
                    
                    if (r.message.roles && Array.isArray(r.message.roles)) {
                        roles = r.message.roles.map(r => r.role);
                    }
                    
                    currentUserRoles = roles;
                    console.log("Final roles:", currentUserRoles);
                    resolve({ user: currentUser, roles: currentUserRoles });
                } else {
                    currentUser = frappe.session.user;
                    currentUserRoles = [];
                    resolve({ user: currentUser, roles: currentUserRoles });
                }
            },
            error: function(err) {
                console.error("Error fetching user:", err);
                currentUser = frappe.session.user;
                currentUserRoles = [];
                resolve({ user: currentUser, roles: currentUserRoles });
            }
        });
    });
}

// Function to check if a role control applies to current user
function doesRoleControlApply(roleControl) {
    return new Promise(async (resolve) => {
        console.log("doesRoleControlApply called with:", roleControl);
        
        // Check if enabled from flags
        if (!roleControl.flags || roleControl.flags.enabled !== 1) {
            console.log("Enabled check failed");
            resolve(false);
            return;
        }

        const { user, roles } = await getCurrentUserAndRoles();
        console.log("Current user:", user, "Roles:", roles);
        
        // Log all properties to see what's available
        console.log("All roleControl properties:", Object.keys(roleControl));
        console.log("Flags content:", roleControl.flags);
        
        // Check for role, user, company in the response
        const targetRole = roleControl.role;
        const targetUser = roleControl.user;
        const targetCompany = roleControl.company;
        
        console.log("Target - Role:", targetRole, "User:", targetUser, "Company:", targetCompany);
        
        // If no filters are set, apply to everyone
        if (!targetRole && !targetCompany && !targetUser) {
            console.log("No filters, applying to everyone");
            resolve(true);
            return;
        }

        // Check user match first (most specific)
        if (targetUser) {
            if (targetUser === user) {
                console.log("User match found");
                resolve(true);
                return;
            } else {
                console.log("User doesn't match");
                resolve(false);
                return;
            }
        }

        // Check role match
        if (targetRole) {
            if (roles.includes(targetRole)) {
                console.log("Role match found");
                resolve(true);
                return;
            } else {
                console.log("Role doesn't match");
                resolve(false);
                return;
            }
        }

        // Check company match
        if (targetCompany) {
            const currentCompany = frappe.defaults.get_default('company');
            console.log("Current company:", currentCompany, "Target company:", targetCompany);
            if (currentCompany === targetCompany) {
                console.log("Company match found");
                resolve(true);
                return;
            } else {
                console.log("Company doesn't match");
                resolve(false);
                return;
            }
        }

        console.log("No matches found");
        resolve(false);
    });
}

function apply_role_control() {
    console.log("apply_role_control called");
    
    frappe.call({
        method: "tally_custom.tally_custom.api.role_control.get_role_controls",
        callback: function (r) {
            console.log("API response received:", r);
            
            if (!r.message) {
                console.log("No message in response");
                return;
            }
    
            // Handle both array and single object responses
            let allConfigs = r.message;
            
            if (!Array.isArray(allConfigs)) {
                console.log("Converting single object to array");
                allConfigs = [allConfigs];
            }
            
            console.log("Configs to process:", allConfigs.length, allConfigs);

            const validConfigsList = allConfigs.filter(cfg => cfg != null);
            console.log("Valid configs after null filter:", validConfigsList.length, validConfigsList);

            // Filter configs that are enabled AND apply to current user
            Promise.all(validConfigsList.map(async (config) => {
                console.log("Checking config:", config);
                console.log("Config flags:", config.flags);
                
                // Check if enabled - enabled is in the flags object
                let isEnabled = false;
                
                // Check if flags exists and has enabled property
                if (config.flags) {
                    console.log("Flags object exists:", config.flags);
                    console.log("enabled value:", config.flags.enabled);
                    
                    if (config.flags.enabled !== undefined) {
                        isEnabled = config.flags.enabled === 1;
                        console.log("isEnabled result:", isEnabled);
                    } else {
                        console.log("enabled property not found in flags");
                    }
                } else {
                    console.log("No flags object found");
                }
                
                if (!isEnabled) {
                    console.log("Config not enabled, skipping");
                    return null;
                }
                
                const applies = await doesRoleControlApply(config);
                console.log("Config applies?", applies);
                return applies ? config : null;
            })).then(filteredConfigs => {
                const validConfigs = filteredConfigs.filter(c => c !== null);
                console.log("Valid configs after filtering:", validConfigs.length, validConfigs);
                
                if (validConfigs.length === 0) {
                    console.log("No applicable configs");
                    window.role_control_cfg = null;
                    removeZeroBlinkStyle();
                    return;
                }
                
                const mergedConfig = mergeRoleControls(validConfigs);
                console.log("Merged config:", mergedConfig);
                window.role_control_cfg = mergedConfig;
    
                if (mergedConfig.flags?.hide_awesome_bar) {
                    $(".awesome-bar, .navbar-search, .search-bar").hide();
                }
    
                if (mergedConfig.flags?.hide_help_menu) {
                    hide_help = 1;
                    hide_help_menu();
                }
    
                if (mergedConfig.flags?.hide_customize_menu) {
                    remove_customize_simple();
                    block_customize_route();
                }         
                
                if (mergedConfig.flags?.hide_sidebar) {
                    hide_sidebar();
                }

                waitForFormAndApply(mergedConfig);
            });
        }
    });
}

// // Main function to apply role control
// function apply_role_control() {
//     console.log("apply_role_control called");
    
//     frappe.call({
//         method: "tally_custom.tally_custom.api.role_control.get_role_controls",
//         callback: function (r) {
//             console.log("API response received:", r);
            
//             if (!r.message) {
//                 console.log("No message in response");
//                 return;
//             }
    
//             // Handle both array and single object responses
//             let allConfigs = r.message;
            
//             if (!Array.isArray(allConfigs)) {
//                 console.log("Converting single object to array");
//                 allConfigs = [allConfigs];
//             }
            
//             console.log("Configs to process:", allConfigs.length, allConfigs);
            
//             // Filter configs that apply to current user
//             Promise.all(allConfigs.map(async (config) => {
//                 const applies = await doesRoleControlApply(config);
//                 console.log("Config applies?", config.name, applies);
//                 return applies ? config : null;
//             })).then(filteredConfigs => {
//                 const validConfigs = filteredConfigs.filter(c => c !== null);
//                 console.log("Valid configs after filtering:", validConfigs.length, validConfigs);
                
//                 if (validConfigs.length === 0) {
//                     console.log("No applicable configs");
//                     window.role_control_cfg = null;
//                     removeZeroBlinkStyle();
//                     return;
//                 }
                
//                 const mergedConfig = mergeRoleControls(validConfigs);
//                 console.log("Merged config:", mergedConfig);
//                 window.role_control_cfg = mergedConfig;
    
//                 if (mergedConfig.flags?.hide_awesome_bar) {
//                     $(".awesome-bar, .navbar-search, .search-bar").hide();
//                 }
    
//                 if (mergedConfig.flags?.hide_help_menu) 
//                 {
//                     hide_help = 1;
//                     hide_help_menu();
//                 }
    
//                 if (mergedConfig.flags?.hide_customize_menu) {
//                     remove_customize_simple();
//                     block_customize_route();
//                 }         
                
//                 if (mergedConfig.flags?.hide_sidebar) {
//                     hide_sidebar();
//                 }

//                 waitForFormAndApply(mergedConfig);
//             });
//         }
//     });
// }

// Function to merge multiple role controls


function mergeRoleControls(configs) {
    if (configs.length === 1) return configs[0];
    
    const merged = {
        flags: {
            hide_awesome_bar: 0,
            hide_help_menu: 0,
            hide_customize_menu: 0,
            hide_sidebar: 0
        },
        hidden_form_buttons: [],
        hidden_desk_menus: []
    };
    
    configs.forEach(config => {
        if (config.flags) {
            merged.flags.hide_awesome_bar = merged.flags.hide_awesome_bar || config.flags.hide_awesome_bar;
            merged.flags.hide_help_menu = merged.flags.hide_help_menu || config.flags.hide_help_menu;
            merged.flags.hide_customize_menu = merged.flags.hide_customize_menu || config.flags.hide_customize_menu;
            merged.flags.hide_sidebar = merged.flags.hide_sidebar || config.flags.hide_sidebar;
        }
        
        if (config.hidden_form_buttons && config.hidden_form_buttons.length) {
            merged.hidden_form_buttons = [...merged.hidden_form_buttons, ...config.hidden_form_buttons];
        }
        
        if (config.hidden_desk_menus && config.hidden_desk_menus.length) {
            merged.hidden_desk_menus = [...merged.hidden_desk_menus, ...config.hidden_desk_menus];
        }
    });
    
    return merged;
}

function removeZeroBlinkStyle() {
    setTimeout(() => {
        if (window._zero_blink_style_id) {
            $(`#${window._zero_blink_style_id}`).remove();
            window._zero_blink_style_id = null;
        }
    }, 2);
    
    $('.page-container button, .page-container .btn, .page-container [data-label], .page-container [data-toggle="dropdown"]')
        .not('.navbar button, .navbar .btn, .modal button, .modal .btn')
        .removeClass('hide-but-active');
}

function hide_help_menu() 
{
    if (hide_help !== 1) return;

    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    const observer = new MutationObserver(() => {
        $('.navbar span').filter(function () {
            return $(this).text().trim() === 'Help';
        }).closest('li').addClass('hide-help-menu');
    });

    observer.observe(navbar, { childList: true, subtree: true });

    $('.navbar span').filter(function () {
        return $(this).text().trim() === 'Help';
    }).closest('li').addClass('hide-help-menu');
}

function remove_customize_simple() {
    $('.menu-item-label')
    .filter(function () {
        return $(this).text().trim() === 'Customize';
    })
    .closest('a.dropdown-item')
    .hide();

$('.menu-item-label[data-label="Edit%20DocType"]')
    .closest('a.dropdown-item')
    .hide();
}

function block_customize_route() {
    const route = frappe.get_route();

    if (!Array.isArray(route) || !route.length) return;
    if (route[0] === 'Form' && route[1] === 'Customize Form') {
        frappe.msgprint(__('You are not allowed to access Customize Form'));
        frappe.set_route('desk');
        return;
    }

    if (route[0] === 'customize') {
        frappe.show_alert(
            { message: __('You are not allowed to access Customize'), indicator: 'red' },
            5
        );
        
        frappe.set_route('desk'); 
    }
}

function hide_sidebar() {
    $('.desk-sidebar, .layout-side-section').hide();
    $('.layout-main-section').css('margin-left', '0');
    $('.sidebar-toggle-btn').hide();
}

function waitForFormAndApply(cfg) {
    const currentView = frappe.get_route()[0];
    console.log("waitForFormAndApply - Current view:", currentView);
    
    if (currentView === "Form") {
        if (cur_frm) {
            console.log("Form view with cur_frm available");
            applyButtonRules(cfg, cur_frm, currentView);
            return;
        }
        
        let attempts = 0;
        const maxAttempts = 50;
        
        const checkInterval = setInterval(() => {
            attempts++;
            if (cur_frm) {
                console.log("cur_frm found after", attempts, "attempts");
                clearInterval(checkInterval);
                applyButtonRules(cfg, cur_frm, currentView);
            } else if (attempts >= maxAttempts) {
                console.log("max attempts reached, applying without cur_frm");
                clearInterval(checkInterval);
                applyButtonRules(cfg, null, currentView);
            }
        }, 100);
    } else if (currentView === "List") {
        if (cur_list) {
            console.log("List view with cur_list available");
            applyButtonRules(cfg, cur_list, currentView);
            return;
        }
        
        let attempts = 0;
        const maxAttempts = 50;
        
        const checkInterval = setInterval(() => {
            attempts++;
            if (cur_list) {
                console.log("cur_list found after", attempts, "attempts");
                clearInterval(checkInterval);
                applyButtonRules(cfg, cur_list, currentView);
            } else if (attempts >= maxAttempts) {
                console.log("max attempts reached, applying without cur_list");
                clearInterval(checkInterval);
                applyButtonRules(cfg, null, currentView);
            }
        }, 100);
    } else {
        console.log("Other view, applying without form/list object");
        applyButtonRules(cfg, null, currentView);
    }
}

function applyButtonRules(cfg, viewObj, currentView) {
    console.log("applyButtonRules called with view:", currentView);
    
    if (isHidingApplied) {
        console.log("Hiding already applied, skipping");
        return;
    }
    
    isHidingApplied = true;
    
    if (cfg.hidden_form_buttons?.length) {
        console.log("Hidden form buttons to process:", cfg.hidden_form_buttons.length);
        
        // Try multiple times with increasing delays
        [0, 100, 300, 500, 1000].forEach((delay, index) => {
            setTimeout(() => {
                console.log(`Button hiding attempt ${index + 1} after ${delay}ms`);
                enforce_button_rules(cfg, viewObj, currentView);
                
                // On the last attempt, remove the blink style
                if (index === 4) {
                    setTimeout(() => {
                        if (window._zero_blink_style_id) {
                            $(`#${window._zero_blink_style_id}`).remove();
                            window._zero_blink_style_id = null;
                        }
                    }, 100);
                }
            }, delay);
        });
    } else {
        console.log("No hidden form buttons in config");
        $('.page-container button, .page-container .btn, .page-container [data-label], .page-container [data-toggle="dropdown"]')
            .not('.navbar button, .navbar .btn, .modal button, .modal .btn')
            .removeClass('hide-but-active');

        setTimeout(() => {
            if (window._zero_blink_style_id) {
                $(`#${window._zero_blink_style_id}`).remove();
                window._zero_blink_style_id = null;
            }
        }, 2);
    }
}

function enforce_button_rules(cfg, viewObj, currentView) {
    if (!cfg?.hidden_form_buttons?.length) return;
    
    let doctype;
    if (currentView === "Form") {
        if (!viewObj) {
            console.log("No viewObj for Form view");
            return;
        }
        doctype = viewObj.doctype;
        console.log("Enforcing rules for Form view, doctype:", doctype);
    } else if (currentView === "List") {
        doctype = frappe.get_route()[1];
        console.log("Enforcing rules for List view, doctype:", doctype);
    } else {
        console.log("Unknown view:", currentView);
        return;
    }
    
    executeButtonRules(cfg, doctype, currentView, viewObj);
}

function executeButtonRules(cfg, doctype, currentView, viewObj) {
    console.log("Executing button rules for", doctype, "in", currentView);
    
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
    
    const standard_buttons = ["save", "submit", "cancel", "amend", "update", "print", 
        "email", "duplicate", "rename", "delete", "<", ">", "..."];
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
                    .filter(function() { return $(this).text().trim() === displayLabel; });
            }
            
            if (hide_only == 1) {
                $btn.addClass('hide-but-active');
            } else {
                $btn.removeClass('hide-but-active');
                if (labelLower === "save" && viewObj) {
                    try { viewObj.disable_save(); } catch (e) {}
                }
                if (labelLower === "submit" && viewObj) {
                    $btn.addClass('hide-but-active');
                }
            }
        }
        
        if ((buttonLocation === "list" || buttonLocation === "both") && currentView === "List") {
            const $toolbarBtns = $(`.list-toolbar button:contains("${displayLabel}"), .list-actions button:contains("${displayLabel}")`)
                .filter(function() { return $(this).text().trim() === displayLabel; });
            
            const $menuBtns = $(`.dropdown-menu li a:contains("${displayLabel}"), .dropdown-menu li:contains("${displayLabel}")`)
                .filter(function() { return $(this).text().trim() === displayLabel; });
            
            const $anyBtns = $(`button:contains("${displayLabel}"), .btn:contains("${displayLabel}")`)
                .filter(function() { return $(this).text().trim() === displayLabel; });
            
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
    }
    else if (labelLower === "print") {
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
    }
    else if (labelLower === "<" || labelLower === ">" || labelLower === "...") {
        if ((buttonLocation === "form" || buttonLocation === "both") && currentView === "Form") {
            if (labelLower === "<") {
                $('button[data-original-title="Previous Document"]').addClass("hide-but-active");
            }
            else if (labelLower === ">") {
                $('button[data-original-title="Next Document"]').addClass("hide-but-active");
            }
            else if (labelLower === "...") {
                $('button[data-original-title="Menu"]').addClass("hide-but-active");
            }
        }
    }
    else {
        let $target = $();
        
        if ((buttonLocation === "form" || buttonLocation === "both") && currentView === "Form") {
            $target = $(`button[data-label="${displayLabel}"]`);
            
            if ($target.length === 0) {
                $target = $(`.btn-secondary:contains("${displayLabel}"), .btn-default:contains("${displayLabel}")`)
                    .filter(function() { return $(this).text().trim() === displayLabel; });
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
                    .filter(function() { return $(this).text().trim() === displayLabel; });
            }
            
            if ($target.length === 0) {
                $target = $(`.form-inner-toolbar button:contains("${displayLabel}"), .page-actions button:contains("${displayLabel}")`)
                    .filter(function() { return $(this).text().trim() === displayLabel; });
            }
        }
        
        if ((buttonLocation === "list" || buttonLocation === "both") && currentView === "List") {
            $target = $(`.list-toolbar button:contains("${displayLabel}"), .list-actions button:contains("${displayLabel}")`)
                .filter(function() { return $(this).text().trim() === displayLabel; });
            
            if ($target.length === 0) {
                $target = $(`.dropdown-menu li a, .dropdown-menu li`).filter(function() {
                    return $(this).text().trim().toLowerCase() === labelLower;
                }).closest('li');
            }
            
            if ($target.length === 0) {
                $target = $(`button:contains("${displayLabel}"), .btn:contains("${displayLabel}")`)
                    .filter(function() { return $(this).text().trim() === displayLabel; });
            }
        }
        
        if ($target.length > 0) {
            $target.addClass('hide-but-active');
            console.log(`Hidden standard button "${labelLower}" (found ${$target.length} instances)`);
        }
    }
}

function hide_custom_button(label, currentView, buttonLocation) {
    const labelLower = label.toLowerCase();
    
    console.log(`Hiding custom button "${labelLower}" in ${currentView} view with location: ${buttonLocation}`);
    
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
    
    const dropdownButtons = $('.btn[data-toggle="dropdown"]').filter(function () {
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
        console.log(`Hidden ${allButtons.length} custom button(s) for "${labelLower}" in ${currentView} view`);
    }
}