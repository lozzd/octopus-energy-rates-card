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
            td.time_highlight {
                font-weight: bold;
                color: white;
            }
            td.current {
                position: relative;
            }    
            td.current:before{
                content: "";
                position: absolute;
                top: 0;
                right: 0;
                width: 0; 
                height: 0; 
                display: block;
                border-top: calc(var(--paper-font-body1_-_line-height)*0.65) solid transparent;
                border-bottom: calc(var(--paper-font-body1_-_line-height)*0.65) solid transparent;

                border-right: 10px solid;
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
            td.time_lightgreen {
                border-bottom: 1px solid ForestGreen;
            }
            td.time_blue{
                border-bottom: 1px solid #391CD9;
            }
            td.time_cheapest{
                border-bottom: 1px solid LightGreen;
            }
            td.time_cheapestblue{
                border-bottom: 1px solid LightBlue;
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
            td.lightgreen {
                border: 2px solid ForestGreen;
                background-color: ForestGreen;
            }
            td.blue {
                border: 2px solid #391CD9;
                background-color: #391CD9;
            }
            td.cheapest {
                color: black;
                border: 2px solid LightGreen;
                background-color: LightGreen;
            }
            td.cheapestblue {
                color: black;
                border: 2px solid LightBlue;
                background-color: LightBlue;
            }
            `;
            card.appendChild(style);
            card.appendChild(this.content);
            this.appendChild(card);
        }

        // Initialise the lastRefreshTimestamp
        if (!this.lastRefreshTimestamp) {
            // Store the timestamp of the last refresh
            this.lastRefreshTimestamp = 0;
        }

        // Check if the interval has passed
        const currentTime = Date.now();
        const cardRefreshIntervalSecondsInMilliseconds = config.cardRefreshIntervalSeconds * 1000;
        if (!(currentTime - this.lastRefreshTimestamp >= cardRefreshIntervalSecondsInMilliseconds)) {
            return
        }
        this.lastRefreshTimestamp = currentTime;

        const colours_import = ['lightgreen', 'green', 'orange', 'red', 'blue', 'cheapest', 'cheapestblue'];
        const colours_export = ['red', 'green', 'orange', 'green'];
        const currentEntityId = config.currentEntity;
        const futureEntityId = config.futureEntity;
        const pastEntityId = config.pastEntity;
        // Create an empty array to store the parsed attributes
        const allSlotsTargetTimes = [];
        const targetTimesEntities = config.targetTimesEntities && Object.keys(config.targetTimesEntities) || [];
        // Iterate through each entity in targetTimesEntities
        for (const entityId of targetTimesEntities) {
            const entityTimesState = hass.states[entityId];
            const entityExtraData = config.targetTimesEntities[entityId] || [];
            const backgroundColour = entityExtraData.backgroundColour || "Navy";
            const timePrefix = entityExtraData.prefix || "";
            // Access the attributes of the current entity
            const entityAttributes = entityTimesState ? this.reverseObject(entityTimesState.attributes) : {};
            // Get the target_times array, handling potential undefined cases
            const targetTimes = entityAttributes.target_times || [];
            // Iterate through each target time and push it individually
            for (const targetTime of targetTimes) {
                allSlotsTargetTimes.push({
                    start: targetTime.start,
                    end: targetTime.end,
                    color: backgroundColour,
                    timePrefix: timePrefix,
                });
            }
        }

        var lowlimit = config.lowlimit;
        var mediumlimit = config.mediumlimit;
        var highlimit = config.highlimit;

        // Check if we've received a number, if not, assume they are entities
        // and read them from the state
        if (isNaN(lowlimit)) {
            lowlimit = parseFloat(hass.states[lowlimit].state)
        }
        if (isNaN(mediumlimit)) {
            mediumlimit = parseFloat(hass.states[mediumlimit].state)
        }
        if (isNaN(highlimit)) {
            highlimit = parseFloat(hass.states[highlimit].state)
        }

        const unitstr = config.unitstr;
        const roundUnits = config.roundUnits;
        const showpast = config.showpast;
        const showday = config.showday;
        const hour12 = config.hour12;
        const cheapest = config.cheapest;
        const combinerate = config.combinerate;
        const multiplier = config.multiplier
        const rateListLimit = config.rateListLimit
        var colours = (config.exportrates ? colours_export : colours_import);
        var rates_totalnumber = 0;
        var combinedRates = [];

        // Grab the rates which are stored as an attribute of the sensor
        const paststate = hass.states[pastEntityId];
        const currentstate = hass.states[currentEntityId];
        const futurestate = hass.states[futureEntityId];

        // Get Limit entity values
        const limitEntity = config.limitEntity;
        const limitEntityState = hass.states[limitEntity];
        const limitHighMult = config.highLimitMultiplier;
        const limitMedMult = config.mediumLimitMultiplier;

        // Create an empty array to store the parsed attributes
        var additionalDynamicLimits = [];
        const additionalDynamicLimitsEntities = config.additionalDynamicLimits && Object.keys(config.additionalDynamicLimits) || [];
        // Iterate through each entity in additionalDynamicLimitsEntities
        for (const entityId of additionalDynamicLimitsEntities) {
            const limitExtraData = config.additionalDynamicLimits[entityId] || [];
            const backgroundColour = limitExtraData.backgroundColour || "";
            const timePrefix = limitExtraData.prefix || "";

            const limit = parseFloat(hass.states[entityId].state);
            if (!isNaN(limit)) {
                additionalDynamicLimits.push({
                    limit: limit,
                    color: backgroundColour,
                    timePrefix: timePrefix,
                })
            } else {
                console.warn("Couldn't parse entity state ${entityId} as a float")
            }
        }

        if (!(limitEntity == null)) {
            const limitAve = parseFloat(limitEntityState.state);
            mediumlimit = limitAve * limitMedMult;
            highlimit = limitAve * limitHighMult;
        };

        // Combine the data sources
        if (typeof (paststate) != 'undefined' && paststate != null) {
            const pastattributes = this.reverseObject(paststate.attributes);
            var ratesPast = pastattributes.rates;

            ratesPast.forEach(function (key) {
                combinedRates.push(key);
                rates_totalnumber++;
            });
        }

        if (typeof (currentstate) != 'undefined' && currentstate != null) {
            const currentattributes = this.reverseObject(currentstate.attributes);
            var ratesCurrent = currentattributes.rates;

            ratesCurrent.forEach(function (key) {
                combinedRates.push(key);
                rates_totalnumber++;
            });
        }
        // Check to see if the 'rates' attribute exists on the chosen entity. If not, either the wrong entity
        // was chosen or there's something wrong with the integration.
        // The rates attribute also appears to be missing after a restart for a while - please see:
        // https://github.com/BottlecapDave/HomeAssistant-OctopusEnergy/issues/135
        if (!ratesCurrent) {
            throw new Error("There are no rates assigned to that entity! Please check integration or chosen entity");
        }

        if (typeof (futurestate) != 'undefined' && futurestate != null) {
            const futureattributes = this.reverseObject(futurestate.attributes);
            var ratesFuture = futureattributes.rates;

            ratesFuture.forEach(function (key) {
                combinedRates.push(key);
                rates_totalnumber++;
            });
        }

        // This is critical to breaking down the columns properly. For now, there's now
        // two loops doing the same thing which is not ideal.
        // TODO: there should be one clear data process loop and one rendering loop? Or a function?
        var rates_list_length = 0;
        var cheapest_rate = 5000;
        var previous_rate = 0;

        var rates_currentNumber = 0;
        var previous_rates_day = "";
        var rates_processingRow = 0;
        var filteredRates = [];

        // filter out rates to display
        combinedRates.forEach(function (key) {
            const date_milli = Date.parse(key.start);
            var date = new Date(date_milli);
            const lang = navigator.language || navigator.languages[0];
            var current_rates_day = date.toLocaleDateString(lang, { weekday: 'short' });
            rates_processingRow++;
            var ratesToEvaluate = key.value_inc_vat * multiplier;

            if ((showpast || (date - Date.parse(new Date()) > -1800000)) && (rateListLimit == 0 || rates_list_length < rateListLimit)) {
                rates_currentNumber++;

                // Find the cheapest rate that hasn't past yet
                if ((ratesToEvaluate < cheapest_rate) && (date - Date.parse(new Date()) > -1800000)) cheapest_rate = ratesToEvaluate;

                // If we don't want to combine same values rates then just push them to new display array
                if (!combinerate) {
                    filteredRates.push(key);
                    rates_list_length++;
                }

                if (combinerate &&
                    (
                        (rates_currentNumber == 1)
                        || (current_rates_day != previous_rates_day)
                        || (previous_rate != ratesToEvaluate)
                    )
                ) {
                    filteredRates.push(key);
                    rates_list_length++;
                }
                previous_rate = ratesToEvaluate;
                previous_rates_day = current_rates_day;
            }
        });

        const rows_per_col = Math.ceil(rates_list_length / config.cols);

        var tables = "";
        tables = tables.concat("<td><table class='sub_table'><tbody>");
        var table = ""
        var x = 1;

        filteredRates.forEach(function (key) {
            const date_milli = Date.parse(key.start);
            var date = new Date(date_milli);
            const lang = navigator.language || navigator.languages[0];
            var options = { hourCycle: 'h23', hour12: hour12, hour: '2-digit', minute: '2-digit' };
            // The time formatted in the user's Locale
            var time_locale = date.toLocaleTimeString(lang, options);
            // If the showday config option is set, include the shortened weekday name in the user's Locale
            var date_locale = (showday ? date.toLocaleDateString(lang, { weekday: 'short' }) + ' ' : '');

            var colour = this._config.colours.low;  // Default to 'low' color
            var isTargetTime = false;
            var targetTimeBackgroundColor = "";
            var targetTimePrefix = "";
            // Check if the current time row corresponds to a target time
            allSlotsTargetTimes.forEach(function (targetTime) {
                const startTime = new Date(targetTime.start);
                const endTime = new Date(targetTime.end);
                if (date >= startTime && date < endTime) {
                    isTargetTime = true;
                    targetTimeBackgroundColor = "' style='background-color: " + targetTime.color + ";";
                    targetTimePrefix = targetTime.timePrefix ? targetTimePrefix + targetTime.timePrefix : targetTimePrefix;
                }
            });
            // Check if we've got any variable limits defined which will take precedence
            additionalDynamicLimits.forEach(function (targetLimit) {
                if (key.value_inc_vat <= targetLimit.limit) {
                    isTargetTime = true;
                    targetTimeBackgroundColor = "' style='background-color: " + targetLimit.color + ";";
                    targetTimePrefix = targetLimit.timePrefix ? targetTimePrefix + targetLimit.timePrefix : targetTimePrefix;
                }
            });

            // Add the extra space at the end of the prefix if it's not empty
            targetTimePrefix = targetTimePrefix ? targetTimePrefix + " " : targetTimePrefix;
            var isCurrentTime = false;
            if ((date - Date.parse(new Date()) > -1800000) && (date < new Date())) {
                if (showpast) {
                    isCurrentTime = true;
                };
            };


            var valueToDisplay = key.value_inc_vat * multiplier;
            // Apply bold styling if the current time is a target time
            var boldStyle = isCurrentTime ? "current " : "";
            boldStyle = isTargetTime ? boldStyle + "time_highlight" : boldStyle + "";
            
            if (cheapest && (valueToDisplay == cheapest_rate && cheapest_rate > 0)) colour = this._config.colours.cheapest;
            else if (cheapest && (valueToDisplay == cheapest_rate && cheapest_rate <= 0)) colour = this._config.colours.cheapestNegative;
            else if (valueToDisplay > highlimit) colour = this._config.colours.highest;
            else if (valueToDisplay > mediumlimit) colour = this._config.colours.high;
            else if (valueToDisplay > lowlimit) colour = this._config.colours.medium;
            else if (valueToDisplay <= 0) colour = this._config.colours.negative;
            else colour = this._config.colours.low;

            if (config.showpast || (date - Date.parse(new Date()) > -1800000)) {
                table = table.concat(`<tr class='rate_row'>
                    <td class='time ${boldStyle}' style='border-bottom: 1px solid ${colour}; ${targetTimeBackgroundColor}'>
                        ${targetTimePrefix}${date_locale}${time_locale}
                    </td>
                    <td class='rate' style='background-color: ${colour}; border: 2px solid ${colour};'>
                        ${valueToDisplay.toFixed(roundUnits)}${unitstr}
                    </td>
                </tr>`);

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
        }.bind(this));
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
        if (!config.currentEntity) {
            throw new Error('You need to define an entity');
        }

        const defaultConfig = {
            targetTimesEntities: null,
            // Additional limits specified in a similar format as targetTimesEntities
            // but they take input_numbers as input
            additionalDynamicLimits: null,
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
            // New color configuration options
            colours: {
                low: 'MediumSeaGreen',
                medium: 'orange',
                high: 'Tomato',
                highest: 'red',
                negative: '#391CD9',
                cheapest: 'LightGreen',
                cheapestNegative: 'LightBlue'
            },
            lowlimit: 5,
            mediumlimit: 20,
            highlimit: 30,
            // Entity to use for dynamic limits, above are ignored if limitEntity is set. 
            limitEntity: null,
            highLimitMultiplier: 1.1,
            mediumLimitMultiplier: 0.8,
            // Controls the rounding of the units of the rate
            roundUnits: 2,
            // The unit string to show if units are shown after each rate
            unitstr: 'p/kWh',
            // Make the colouring happen in reverse, for export rates
            exportrates: false,
            // Higlight the cheapest rate
            cheapest: false,
            // Combine equal rates
            combinerate: false,
            // multiple rate values for pence (100) or pounds (1)
            multiplier: 100,
            // Limit display to next X rows
            rateListLimit: 0,
            // How often should the card refresh in seconds
            cardRefreshIntervalSeconds: 60
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
