frappe.pages['custom-journal-entry-5'].on_page_load = function(wrapper) {

    let page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Journal Entries',
        single_column: true
    });

    // Add New Voucher Button
    page.set_primary_action('New Voucher', () => {
        frappe.set_route('custom-journal-entry');
    });

    $(page.body).html(`

        <div class="voucher-list-container">

            <table class="table table-hover" id="voucher_list_table">

                <thead>
                    <tr>
                        <th>Voucher No</th>
                        <th>Date</th>
                        <th>Voucher Type</th>
                        <th>Company</th>
                        <th>Total Debit</th>
                        <th>Status</th>
                    </tr>
                </thead>

                <tbody id="voucher_list_body"></tbody>

            </table>

        </div>

    `);

    load_vouchers();

};

function load_vouchers(){

    frappe.call({
        method: "frappe.client.get_list",
        args: {
            doctype: "Journal Entry",
            fields: [
                "name",
                "posting_date",
                "voucher_type",
                "company",
                "total_debit",
                "docstatus"
            ],
            order_by: "posting_date desc",
            limit_page_length: 50
        },
        callback: function(r){

            let rows = r.message || [];

            $("#voucher_list_body").empty();

            rows.forEach(row => {

                let status = row.docstatus == 1 ? "Submitted" : "Draft";

                let tr = `
                    <tr class="voucher-row" data-name="${row.name}">

                        <td>${row.name}</td>
                        <td>${row.posting_date}</td>
                        <td>${row.voucher_type}</td>
                        <td>${row.company}</td>
                        <td>${row.total_debit || 0}</td>
                        <td>${status}</td>

                    </tr>
                `;

                $("#voucher_list_body").append(tr);

            });

        }
    });

}

$(document).on("click",".voucher-row",function(){

    let name = $(this).data("name");

    frappe.set_route("custom-journal-entry",{
        name: name
    });

});