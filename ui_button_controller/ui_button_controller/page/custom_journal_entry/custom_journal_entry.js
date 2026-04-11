// frappe.pages['custom-journal-entry'].on_page_load = function(wrapper) {
//     let page = frappe.ui.make_app_page({
//         parent: wrapper,
//         title: 'Voucher Entry',
//         single_column: true
//     });

//     $(page.body).html(`
//         <style>
//             /* Modern Variables */
//             :root {
//                 --primary-color: #2490ef;
//                 --success-color: #34c759;
//                 --border-color: #e4e7ed;
//                 --hover-color: #f5f7fa;
//                 --focus-color: #e8f0fe;
//                 --text-primary: #2c3e50;
//                 --text-secondary: #6c757d;
//                 --shadow-sm: 0 2px 4px rgba(0,0,0,0.02);
//                 --shadow-md: 0 4px 12px rgba(0,0,0,0.05);
//                 --input-height: 46px; 
//             }

//             .voucher-container {
//                 max-width: 1200px;
//                 margin: 20px auto;
//                 background: white;
//                 padding: 28px 32px;
//                 border-radius: 16px;
//                 box-shadow: var(--shadow-md);
//                 border: 1px solid var(--border-color);
//                 overflow: visible !important;
//             }

//             .voucher-header {
//                 display: flex;
//                 gap: 24px;
//                 margin-bottom: 28px;
//                 flex-wrap: wrap;
//                 background: #fafbfc;
//                 padding: 20px 24px;
//                 border-radius: 12px;
//                 border: 1px solid var(--border-color);
//             }

//             .voucher-header > div {
//                 flex: 1;
//                 min-width: 200px;
//             }

//             .voucher-header label {
//                 font-weight: 600;
//                 font-size: 13px;
//                 color: var(--text-secondary);
//                 margin-bottom: 6px;
//                 display: block;
//                 letter-spacing: 0.3px;
//             }

//             .voucher-header input,
//             .voucher-header select {
//                 width: 100%;
//                 height: var(--input-height);
//                 padding: 0 14px;
//                 border: 1px solid var(--border-color);
//                 border-radius: 10px;
//                 font-size: 14px;
//                 transition: all 0.2s ease;
//                 background: white;
//                 color: var(--text-primary);
//                 line-height: var(--input-height);
//             }

//             #voucher_table {
//                 width: 100%;
//                 table-layout: fixed;
//                 border-collapse: collapse;
//                 margin: 10px 0;
//                 overflow: visible !important;
//             }

//             #voucher_table th {
//                 text-align: left;
//                 font-weight: 600;
//                 font-size: 13px;
//                 color: var(--text-secondary);
//                 padding: 12px 16px;
//                 background: transparent;
//                 border: none;
//                 letter-spacing: 0.5px;
//                 text-transform: uppercase;
//             }

//             #voucher_table td {
//                 background: white;
//                 padding: 4px 0;
//                 border: none;
//                 vertical-align: middle;
//                 height: var(--input-height);
//                 overflow: visible !important;
//                 position: relative;
//             }

//             .input-container,
//             .ledger-container {
//                 height: var(--input-height);
//                 background: white;
//                 border: 1px solid var(--border-color);
//                 border-radius: 12px;
//                 transition: all 0.2s ease;
//                 position: relative;
//                 margin: 0;
//                 overflow: visible !important; 
//                 box-sizing: border-box;
//             }

//             .ledger-container {
//                 display: flex;
//                 align-items: center;
//                 width: 100%;
//                 padding: 0;
//                 z-index: 1;
//             }

//             .ledger-cell {
//                 width: 100%;
//                 height: 100%;
//                 display: flex;
//                 align-items: center;
//                 overflow: visible !important;
//             }

//             /* VERTICAL CENTER FIX FOR LINK FIELD */
//             .frappe-control {
//                 margin: 0 !important;
//                 padding: 0 !important;
//                 height: 100% !important;
//                 width: 100% !important;
//                 display: flex !important;
//                 align-items: center !important;
//             }

//             .control-input-wrapper {
//                 height: 100% !important;
//                 width: 100% !important;
//                 display: flex !important;
//                 align-items: center !important;
//             }

//             .link-field {
//                 height: 100% !important;
//                 width: 100% !important;
//                 display: flex !important;
//                 align-items: center !important;
//             }

//             /* This targets the specific input inside Frappe's link control */
//             .link-field .input-with-feedback {
//                 height: var(--input-height) !important;
//                 line-height: var(--input-height) !important;
//                 padding: 0 16px !important;
//                 border: none !important;
//                 outline: none !important;
//                 background: transparent !important;
//                 box-shadow: none !important;
//                 display: flex !important;
//                 align-items: center !important;
//             }

//             #voucher_table input.debit, 
//             #voucher_table input.credit {
//                 width: 100%;
//                 height: var(--input-height) !important;
//                 line-height: var(--input-height) !important;
//                 border: none !important;
//                 background: transparent !important;
//                 padding: 0 16px !important;
//                 font-size: 14px;
//                 text-align: right;
//             }

//             /* Awesomplete dropdown positioning */
//             .awesomplete > ul {
//                 z-index: 1050 !important;
//                 margin-top: 4px !important;
//             }

//             /* Footer & Buttons Styles Remain Same */
//             .voucher-footer {
//                 display: flex;
//                 justify-content: space-between;
//                 align-items: center;
//                 margin-top: 28px;
//                 padding-top: 20px;
//                 border-top: 2px dashed var(--border-color);
//             }

//             .totals-container {
//                 display: flex;
//                 gap: 24px;
//                 background: #f8f9fc;
//                 padding: 16px 24px;
//                 border-radius: 14px;
//                 border: 1px solid var(--border-color);
//             }

//             .total-value {
//                 font-weight: 700;
//                 font-size: 20px;
//                 font-family: 'Inter', -apple-system, sans-serif;
//             }

//             .action-buttons button {
//                 height: 46px;
//                 padding: 0 24px;
//                 border-radius: 12px;
//                 font-weight: 600;
//                 cursor: pointer;
//             }

//             .btn-add {
//                 background: white;
//                 color: var(--primary-color);
//                 border: 1px solid var(--border-color) !important;
//             }

//             .btn-save {
//                 background: var(--primary-color);
//                 color: white;
//             }
//         </style>

//         <div class="voucher-container">
//             <div class="voucher-header">
// 			<div>
//                     <label>📋 VOUCHER TYPE</label>
//                     <select class="form-control" id="voucher_type">
//                         <option>Journal Entry</option>
// 						<option>Cash Entry</option>
// 						<option>Bank Entry</option>
// 						<option>Contra Entry</option>
// 						<option>Debit Note</option>
// 						<option>Credit Note</option>
// 						<option>Write Off Entry</option>
// 						<option>Opening Entry</option>

//                     </select>
//                 </div>
//                 <div>
//                     <label>📅 POSTING DATE</label>
//                     <input type="date" class="form-control" id="posting_date">
//                 </div>
                
//             </div>

//             <table class="table" id="voucher_table">
//                 <thead>
//                     <tr>
//                         <th style="width: 45%;">Ledger Account</th>
//                         <th style="width: 25%;">Debit (₹)</th>
//                         <th style="width: 30%;">Credit (₹)</th>
//                     </tr>
//                 </thead>
//                 <tbody id="voucher_body"></tbody>
//             </table>

//             <div class="voucher-footer">
//                 <div class="totals-container">
//                     <div class="total-item">
//                         <span class="total-label">Total Debit</span>
//                         <span class="total-value debit" id="total_debit">₹ 0.00</span>
//                     </div>
//                     <div class="total-item">
//                         <span class="total-label">Total Credit</span>
//                         <span class="total-value credit" id="total_credit">₹ 0.00</span>
//                     </div>
//                 </div>

//                 <div class="action-buttons">
//                     <button class="btn-add" id="add_row_btn">
//                         <span>➕</span> Add Row
//                     </button>
//                     <button class="btn-save" id="save_voucher">
//                         <span>💾</span> Save Voucher
//                     </button>
//                 </div>
//             </div>
//         </div>
//     `);

//     // Event Bindings
//     $(page.body).find("#add_row_btn").on('click', () => add_row());
//     $(page.body).on('input', '.debit, .credit', calculateTotals);

//     // Reliable page show event
//     page.wrapper.on('show', function() {
//         console.log("Page Shown - Checking route options...");
        
//         let params = frappe.route_options; 
        
//         if (params && params.name) {
//             console.log("Record detected:", params.name);
//             load_existing_voucher(params.name);
//             frappe.route_options = null; // Clear to prevent infinite reload loop
//         } else if ($("#voucher_body tr").length === 0) {
//             add_row();
//             add_row();
//         }
//     });
// };

// function load_existing_voucher(name) {
//     frappe.call({
//         method: "frappe.client.get",
//         args: {
//             doctype: "Journal Entry",
//             name: name
//         },
//         callback: function(response) {
//             let voucher = response.message;
//             if(!voucher) return;

//             // Map Header
//             $("#posting_date").val(voucher.posting_date);
//             $("#voucher_type").val(voucher.voucher_type);
            
//             // Clear current table rows
//             $("#voucher_body").empty();
            
//             // Map Child Table (accounts)
//             let rows = voucher.accounts || []; 
//             rows.forEach((row_data) => {
//                 add_row(row_data.account, row_data.debit, row_data.credit);
//             });

//             calculateTotals();
//         }
//     });
// }

// function add_row(account = "", debit = "", credit = "") {
//     let row_id = frappe.utils.get_random(5);
//     let row = `
//         <tr id="row-${row_id}">
//             <td><div class="ledger-container"><div class="ledger-cell" id="ledger-${row_id}"></div></div></td>
//             <td><div class="input-container"><input class="form-control debit" type="number" value="${debit}" placeholder="0.00"></div></td>
//             <td><div class="input-container"><input class="form-control credit" type="number" value="${credit}" placeholder="0.00"></div></td>
//         </tr>
//     `;

//     $("#voucher_body").append(row);

//     // Initialize Link control with unique fieldname to prevent 'get_field' errors
//     let ledger_control = frappe.ui.form.make_control({
//         parent: $(`#ledger-${row_id}`),
//         df: {
//             fieldtype: "Link",
//             options: "Account",
//             fieldname: "account_" + row_id, 
//             placeholder: "Search account...",
//             only_select: 1 
//         },
//         render_input: true
//     });

//     ledger_control.refresh();

//     if (account) {
//         ledger_control.set_value(account);
//     }

//     // Vertical alignment styling for the link field
//     setTimeout(() => {
//         let $ctrl = $(`#ledger-${row_id}`).find('.frappe-control');
//         $ctrl.css({
//             'height': 'var(--input-height)',
//             'display': 'flex',
//             'align-items': 'center'
//         });
        
//         $ctrl.find('input').css({
//             'border': 'none',
//             'background': 'transparent',
//             'padding': '0 16px',
//             'width': '100%'
//         });
//     }, 100);
// }

// function calculateTotals() {
//     let total_debit = 0;
//     let total_credit = 0;

//     $("#voucher_body tr").each(function() {
//         let debit = parseFloat($(this).find('.debit').val()) || 0;
//         let credit = parseFloat($(this).find('.credit').val()) || 0;
//         total_debit += debit;
//         total_credit += credit;
//     });

//     $("#total_debit").text('₹ ' + total_debit.toFixed(2));
//     $("#total_credit").text('₹ ' + total_credit.toFixed(2));
// }