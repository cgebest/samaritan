/*
 * Copyright (C) 2020 - 2021  Chang Ge  cgebest AT gmail.com
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */


let tagButton = document.getElementById("tagButton");

tagButton.addEventListener("click", async () => {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    let year =  parseInt(document.getElementById('year').value);
    let author_url = document.getElementById('author').value;

    findCOI(year, author_url);

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: highlightCOI,
    });
});


function findCOI(year, author_url) {

    let coi = new Set();
    let today_year = new Date().getFullYear();
    let target_year = new Set();

    for (let i=0; i <= year; i++){
        target_year.add(today_year-i);
    }

    let author_xml = author_url.replace("html", "xml");

    let x = new XMLHttpRequest();
    x.open("GET", author_xml, false);
    x.onreadystatechange = function () {

        if (x.readyState == 4 && x.status == 200)
        {
            var doc = x.responseXML;
        }
    };
    x.send(null);

    let parser = new DOMParser();
    let pubs = parser.parseFromString(x.responseText, "text/xml");

    let rs = pubs.getElementsByTagName("r");
    for (let i = 0; i < rs.length; i++) {
        let e = rs[i].childNodes[0]
        // structure for coauthors and year
        let crnt_coauthors = new Set();
        let crnt_year = -1;
        for (let j = 0; j < e.childNodes.length; j++) {
            let detail = e.childNodes[j];
            if (detail.nodeType === 1) {
                if (detail.nodeName == 'year') {
                    crnt_year = parseInt(detail.firstChild.nodeValue);
                }
                if (detail.nodeName == 'author') {
                    crnt_coauthors.add(detail.firstChild.nodeValue);
                }
            }
        }

        if (target_year.has(crnt_year)) {
            for (let item of crnt_coauthors) {
                coi.add(item);
            }
        }
    }

    coi_arr = Array.from(coi);
    coi_str = JSON.stringify(coi_arr);
    chrome.storage.sync.set({coi: coi_str}, function() {
        console.log('coi_str is stored: ', coi_str);
    });

};


function highlightCOI(){
    chrome.storage.sync.get(['coi'], function(result) {
        let coi_arr = JSON.parse(result.coi);
        console.log('coi is retrieved: ', coi_arr);

        const tbody = document.querySelector('#ReviewersTable tbody');

        for (let i = 0; i < tbody.rows.length; i++) {
            const row = tbody.rows[i];
            for (let cell of row.cells) {
                // cell.style.backgroundColor = "";
                // cell.style.color = "";
                // cell.style.fontWeight = "";
                cell.style.boxShadow = "";
            }
        }


        let row, fname, lname;
        let count = 0;
        for (let i = 0; i < tbody.rows.length; i++) {
            row = tbody.rows[i];
            fname = row.cells[0].innerHTML;
            lname = row.cells[1].innerHTML;
            var found = false;

            for (const crnt_coi of coi_arr) {
                if (crnt_coi.includes(fname) && crnt_coi.includes(lname)){
                    found = true;
                    break;
                }
            }//end check coi array

            if (found) {
                for (let cell of row.cells) {
                    cell.style.boxShadow = "inset 0 0 0 9999px #FF0000";
                }
                count += 1;
            }
        }
        alert(`Please double check ${count} conflicting reviewers!`);
    });
};


