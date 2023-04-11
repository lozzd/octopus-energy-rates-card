class OctopusEnergyRatesCard extends HTMLElement {
    set hass(hass) {
        const config = this._config;
        if (!this.content) {
            const card = document.createElement('ha-card');
            card.header = config.title;
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

        const colours_import = [ 'green', 'red', 'orange', 'blue' ];
        const colours_export = [ 'red', 'green', 'orange' ];

        const entityId = config.entity;
        const state = hass.states[entityId];
        const attributes = this.reverseObject(state.attributes);
        const stateStr = state ? state.state : 'unavailable';
        const mediumlimit = config.mediumlimit;
        const highlimit = config.highlimit;
        const unitstr = config.unitstr;
        const roundUnits = config.roundUnits;
        const showpast = config.showpast;
        const showday = config.showday;
        const hour12 = config.hour12;

        var colours = (config.exportrates ? colours_export : colours_import);

        // Grab the rates which are stored as an attribute of the sensor
        var rates = attributes.rates
        // Check to see if the 'rates' attribute exists on the chosen entity. If not, either the wrong entity
        // was chosen or there's something wrong with the integration.
        // The rates attribute also appears to be missing after a restart for a while - please see:
        // https://github.com/BottlecapDave/HomeAssistant-OctopusEnergy/issues/135
        if (!rates) {
            throw new Error("There are no rates assigned to that entity! Please check integration or chosen entity");
        }

        // This is critical to breaking down the columns properly. For now, there's now
        // two loops doing the same thing which is not ideal.
        // TODO: there should be one clear data process loop and one rendering loop? Or a function?
        var rates_list_length = 0;
        rates.forEach(function (key) {
            const date_milli = Date.parse(key.from);
            var date = new Date(date_milli);
            if(showpast || (date - Date.parse(new Date())>-1800000)) {
                rates_list_length++;
            }
        });
        const rows_per_col = Math.ceil(rates_list_length / config.cols);

        var tables = "";
        tables = tables.concat("<td><table class='sub_table'><tbody>");
        var table = ""
        var x = 1;

        rates.forEach(function (key) {
            const date_milli = Date.parse(key.from);
            var date = new Date(date_milli);
            const lang = navigator.language || navigator.languages[0];
            var options = {hourCycle: 'h23', hour12: hour12, hour: '2-digit', minute:'2-digit'};
            // The time formatted in the user's Locale
            var time_locale = date.toLocaleTimeString(lang, options);
            // If the showday config option is set, include the shortened weekday name in the user's Locale
            var date_locale = (showday ? date.toLocaleDateString(lang, { weekday: 'short' }) + ' ' : '');

            var colour = colours[0];
            if(key.rate > config.highlimit) colour = colours[1];
            else if(key.rate > config.mediumlimit) colour = colours[2];
            else if(key.rate <= 0 ) colour = colours[3];

            if(showpast || (date - Date.parse(new Date())>-1800000)) {
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

        const defaultConfig = {
            // Controls how many columns the rates split in to
            cols: 1,
            // Show rates that already happened in the card
            showpast: false,
            // Show the day of the week with the time
            showday: false,
            // Use 12 or 24 hour time
            hour12: true,
            // Controls the title of the card
            title: 'Agile Rates',
            // Colour controls:
            // If the price is above highlimit, the row is marked red.
            // If the price is above mediumlimit, the row is marked yellow.
            // If the price is below mediumlimit, the row is marked green.
            // If the price is below 0, the row is marked blue.
            mediumlimit: 20,
            highlimit: 30,
            // Controls the rounding of the units of the rate
            roundUnits: 2,
            // The unit string to show if units are shown after each rate
            unitstr: 'p/kWh',
            // Make the colouring happen in reverse, for export rates
            exportrates: false,
        };

        const cardConfig = {
            ...defaultConfig,
            ...config,
        };

        this._config = cardConfig;

    }

    // The height of your card. Home Assistant uses this to automatically
    // distribute all cards over the available columns.
    getCardSize() {
        return 3;
    }
}

customElements.define('octopus-energy-rates-card', OctopusEnergyRatesCard);
// Configure the preview in the Lovelace card picker
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'octopus-energy-rates-card',
  name: 'Octopus Energy Rates Card',
  preview: false,
  description: 'This card displays the energy rates for Octopus Energy',
});
