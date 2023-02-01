class AgileRatesCard extends HTMLElement {
    set hass(hass) {
        if (!this.content) {
            const card = document.createElement('ha-card');
            card.header = this.title;
            this.content = document.createElement('div');
            this.content.style.padding = '0 16px 16px';

            const style = document.createElement('style');
            style.textContent = `
            table {
                width: 100%;
                padding: 0px;
                spacing: 0px;
            }
            table.sub_table {
                border-collapse: seperate;
                border-spacing: 0px 2px;
            }
            table.main {
                padding: 0px;
            }
            thead th {
                text-align: left;
                padding: 0px;
            }
            td {
                vertical-align: top;
                padding: 2px;
                spacing: 0px;
            }
            tr.rate_row{
                text-align:center;
                width:80px;
            }
            td.time {
                text-align:center;
                vertical-align: middle;
            }
            td.time_red{
                border-bottom: 1px solid Tomato;
            }
            td.time_orange{
                border-bottom: 1px solid orange;
            }
            td.time_green{
                border-bottom: 1px solid MediumSeaGreen;
            }
            td.time_blue{
                border-bottom: 1px solid #391CD9;
            }
            td.rate {
                color:white;
                text-align:center;
                vertical-align: middle;
                width:80px;

                border-top-right-radius:15px;
                border-bottom-right-radius:15px;
            }
            td.red {
                border: 2px solid Tomato;
                background-color: Tomato;
            }
            td.orange {
                border: 2px solid orange;
                background-color: orange;
            }
            td.green {
                border: 2px solid MediumSeaGreen;
                background-color: MediumSeaGreen;
            }
            td.blue {
                border: 2px solid #391CD9;
                background-color: #391CD9;
            }
            `;
            card.appendChild(style);
            card.appendChild(this.content);
            this.appendChild(card);
        }

        const entityId = this.config.entity;
        const state = hass.states[entityId];
        const attributes = this.reverseObject(state.attributes);
        const stateStr = state ? state.state : 'unavailable';
        const mediumlimit = this.mediumlimit;
        const highlimit = this.highlimit;
        const unitstr = this.unitstr;
        const roundUnits = this.roundUnits;
        const showpast = this.showpast;
        const showday = this.showday;

        // Grab the rates which are stored as an attribute of the sensor
        var rates = attributes.rates

        // This is critical to breaking down the columns properly. For now, there's now
        // two loops doing the same thing which is not ideal.
        // TODO: there should be one clear data process loop and one rendering loop? Or a function?
        var rates_list_length = 0;
        rates.forEach(function (key) {
            const date_milli = Date.parse(key.from);
            var date = new Date(date_milli);
            if(showpast || (date - Date.parse(new Date())>0)) {
                rates_list_length++;
            }
        });
        const rows_per_col = Math.ceil(rates_list_length / this.cols);

        var tables = "";
        tables = tables.concat("<td><table class='sub_table'><tbody>");
        var table = ""
        var x = 1;

        rates.forEach(function (key) {
            const date_milli = Date.parse(key.from);
            var date = new Date(date_milli);
            const lang = navigator.language || navigator.languages[0];
            var options = { hour12: false, hour: '2-digit', minute:'2-digit'};
            // The time formatted in the user's Locale
            var time_locale = date.toLocaleTimeString(lang, options);
            // If the showday config option is set, include the shortened weekday name in the user's Locale
            var date_locale = (showday ? date.toLocaleDateString(lang, { weekday: 'short' }) + ' ' : '');

            var colour = "green";
            if(key.rate > highlimit) colour = "red";
            else if(key.rate > mediumlimit) colour = "orange";
            else if(key.rate <= 0 ) colour = "blue";

            if(showpast || (date - Date.parse(new Date())>0)) {
                table = table.concat("<tr class='rate_row'><td class='time time_"+colour+"'>" + date_locale + time_locale + 
                        "</td><td class='rate "+colour+"'>" + key.rate.toFixed(roundUnits) + unitstr + "</td></tr>");
                if (x % rows_per_col == 0) {
                    tables = tables.concat(table);
                    table = "";
                    if (rates_list_length != x) {
                        tables = tables.concat("</tbody></table></td>");
                        tables = tables.concat("<td><table class='sub_table'><tbody>");
                    }
                };
                x++;
            }

        });
        tables = tables.concat(table);
        tables = tables.concat("</tbody></table></td>");

        this.content.innerHTML = `
        <table class="main">
            <tr>
                ${tables}
            </tr>
        </table>
        `;
    }


    reverseObject(object) {
        var newObject = {};
        var keys = [];

        for (var key in object) {
            keys.push(key);
        }

        for (var i = keys.length - 1; i >= 0; i--) {
            var value = object[keys[i]];
            newObject[keys[i]] = value;
        }

        return newObject;
    }

    setConfig(config) {
        if (!config.entity) {
            throw new Error('You need to define an entity');
        }


        this.config = config;

        // Controls how many columns the rates split in to
        this.cols = (!config.cols ? 1 : config.cols);

        // Show rates that already happened in the card
        this.showpast = (!config.showpast ? false : config.showpast);

        // Show the day of the week with the time
        this.showday = (!config.showday ? false : config.showday);

        // Controls the title of the card
        this.title = (!config.title ? 'Agile Rates' : config.title);

        // Colour controls:
        // If the price is above highlimit, the row is marked red.
        // If the price is above mediumlimit, the row is marked yellow.
        // If the price is below mediumlimit, the row is marked green.
        // If the price is below 0, the row is marked blue.
        this.mediumlimit = (!config.mediumlimit ? 20 : config.mediumlimit);
        this.highlimit = (!config.highlimit ? 30 : config.highlimit);

        // Controls the rounding of the units of the rate
        this.roundUnits = (!config.roundUnits ? 2 : config.roundUnits);

        // Controls whether the units are shown with the rate in each row
        if(!config.showunits) {
            this.unitstr = "p/kWh";
        }
        else {
            if(config.showunits == "true") this.unitstr = "p/kWh";
            else this.unitstr = "";
        }
    }

    // The height of your card. Home Assistant uses this to automatically
    // distribute all cards over the available columns.
    getCardSize() {
        return 3;
    }
}

customElements.define('agile-rates-card', AgileRatesCard);

