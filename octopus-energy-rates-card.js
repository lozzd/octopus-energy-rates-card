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
            .time_highlight { font-weight: bold; color: white; }
            .current { position: relative; }
            .current:before{ content: ""; position: absolute; top: 0; right: 0; width: 0; height: 0; display: block; border-top: calc(var(--ha-font-size-l) * .65) solid transparent; border-bottom: calc(var(--ha-font-size-l) * .65) solid transparent; border-right: 10px solid; }

            .time_red{ border-bottom: 1px solid Tomato; }
            .time_orange{ border-bottom: 1px solid orange; }
            .time_green{ border-bottom: 1px solid MediumSeaGreen; }
            .time_lightgreen { border-bottom: 1px solid ForestGreen; }
            .time_blue{ border-bottom: 1px solid #391CD9; }
            .time_cheapest{ border-bottom: 1px solid LightGreen; }
            .time_cheapestblue{ border-bottom: 1px solid LightBlue; }

            .red { border: 2px solid Tomato; background-color: Tomato; }
            .orange { border: 2px solid orange; background-color: orange; }
            .green { border: 2px solid MediumSeaGreen; background-color: MediumSeaGreen; }
            .lightgreen { border: 2px solid ForestGreen; background-color: ForestGreen; }
            .blue { border: 2px solid #391CD9; background-color: #391CD9; }
            .cheapest { color: black; border: 2px solid LightGreen; background-color: LightGreen; }
            .cheapestblue { color: black; border: 2px solid LightBlue; background-color: LightBlue; }

            .rates-grid {
                display: grid;
                gap: 12px;
                width: 100%;
                box-sizing: border-box;
                align-items: start;
                grid-auto-rows: auto;
                overflow: visible;
                justify-content: start;
                grid-auto-columns: minmax(130.344px, 1fr);
            }

            .rates-grid.layout-vertical {
                /* items flow top-to-bottom until the available height is used, then continue in the next column. */
                display: block;
                column-width: 130.344px;
                column-gap: 12px;
            }

            .rates-grid.layout-horizontal {
                grid-auto-flow: row;
                justify-content: start;
                gap: 2px 12px;
            }

            .rates-grid.layout-horizontal .rate-row {
                display: flex;
                align-items: stretch; /* make children equal height so underline lines up */
                justify-content: flex-start;
                gap: 0;
                padding: 0;
                box-sizing: border-box;
                min-width: 0;
                width: 100%;
                justify-self: stretch;
            }

            .rates-grid.layout-vertical .rate-row {
                display: inline-flex;
                width: 100%;
                align-items: stretch;
                justify-content: flex-start;
                gap: 0;
                padding: 0 0 2px 0;
                box-sizing: border-box;
            }

            .time {
                text-align: center;
                vertical-align: middle;
                flex: 1 1 auto;
                padding: 4px 6px;
                white-space: normal;
                overflow-wrap: anywhere;
                word-break: break-word;
                font-size: var(--ha-font-size-sm);
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 2px;
                min-width: 50px;
                min-height: 40px;
                box-sizing: border-box;
            }

            .rate {
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                text-align: center;
                vertical-align: middle;
                flex: 0 0 64px;
                min-width: 50px;
                min-height: 40px;
                border-top-right-radius: 15px;
                border-bottom-right-radius: 15px;
                padding: 2px;
                margin-left: 0;
                box-sizing: border-box;
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
        const navigatorLanguage = (typeof navigator !== 'undefined') ? (navigator.languages && navigator.languages.length ? navigator.languages[0] : navigator.language) : 'en-US';
        const language = hass.locale?.language || hass.language || navigatorLanguage || 'en-US';
        const isValidTimeZone = (tz) => {
            if (!tz) {
                return false;
            }
            try {
                new Intl.DateTimeFormat(undefined, { timeZone: tz });
                return true;
            } catch (_error) {
                return false;
            }
        };
        const candidateTimeZones = [
            hass.locale?.time_zone,
            hass.config?.time_zone,
            Intl.DateTimeFormat().resolvedOptions().timeZone,
            'UTC',
        ];
        const timeZone = candidateTimeZones.find((tz) => isValidTimeZone(tz));
        const dayFormatter = new Intl.DateTimeFormat(language, { weekday: 'short', timeZone });
        const timeFormatter = new Intl.DateTimeFormat(language, {
            hour: '2-digit',
            minute: '2-digit',
            hour12: hour12,
            hourCycle: hour12 ? 'h12' : 'h23',
            timeZone: timeZone,
        });
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
            var current_rates_day = dayFormatter.format(date);
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

        var layout = config.layoutOrientation || "vertical";
        var order = config.layoutOrder || "asc";

        if (order === "asc") {
            filteredRates.sort(function(a, b) { return Date.parse(a.start) - Date.parse(b.start); });
        } else {
            filteredRates.sort(function(a, b) { return Date.parse(b.start) - Date.parse(a.start); });
        }

        function renderRateRow(key) {
            const date_milli = Date.parse(key.start);
            var date = new Date(date_milli);
            // The time formatted in Home Assistant's timezone (fallback to browser)
            var time_locale = timeFormatter.format(date);
            // If the showday config option is set, include the shortened weekday name in Home Assistant's timezone
            var date_locale = (showday ? dayFormatter.format(date) + ' ' : '');

            var colour = colours[1]; // Default to 'green' (index 1) (below low limit above 0)
            var isTargetTime = false;
            var targetTimeBackgroundColor = "";
            var targetTimePrefix = "";

            // Check if the current time row corresponds to a target time
            allSlotsTargetTimes.forEach(function (targetTime) {
                const startTime = new Date(targetTime.start);
                const endTime = new Date(targetTime.end);
                if (date >= startTime && date < endTime) {
                    isTargetTime = true;
                    targetTimeBackgroundColor = " style='background-color: " + targetTime.color + ";'";
                    targetTimePrefix = targetTime.timePrefix ? targetTimePrefix + targetTime.timePrefix : targetTimePrefix;
                }
            });

            // Check if we've got any variable limits defined which will take precedence
            additionalDynamicLimits.forEach(function (targetLimit) {
                if (key.value_inc_vat <= targetLimit.limit) {
                    isTargetTime = true;
                    targetTimeBackgroundColor = " style='background-color: " + targetLimit.color + ";'";
                    targetTimePrefix = targetLimit.timePrefix ? targetTimePrefix + targetLimit.timePrefix : targetTimePrefix;
                }
            });

            // Add the extra space at the end of the prefix if it's not empty
            targetTimePrefix = targetTimePrefix ? targetTimePrefix + ' ' : targetTimePrefix;
            var isCurrentTime = false;
            if ((date - Date.parse(new Date()) > -1800000) && (date < new Date())) {
                if (showpast) {
                    isCurrentTime = true;
                    targetTimeBackgroundColor = " style='background-color: gray;'";
                }
            }

            var valueToDisplay = key.value_inc_vat * multiplier;
            // Apply bold styling if the current time is a target time
            var boldStyle = isCurrentTime ? "current " : "";
            boldStyle = isTargetTime ? boldStyle + "time_highlight" : boldStyle + "";
            if (cheapest && (valueToDisplay == cheapest_rate && cheapest_rate > 0)) colour = colours[5];
            else if (cheapest && (valueToDisplay == cheapest_rate && cheapest_rate <= 0)) colour = colours[6];
            else if (valueToDisplay > highlimit) colour = colours[3]; //red (import) / green (export)
            else if (valueToDisplay > mediumlimit) colour = colours[2]; // orange (import) / orange (export)
            else if (valueToDisplay > lowlimit) colour = colours[0]; // lightgreen  (import) / red (export)
            else if (valueToDisplay <= 0) colour = colours[4]; // below 0 - blue (import/export)

            var timeClass = "time " + boldStyle + " time_" + colour;
            var rateClass = "rate " + colour;

            return "<div class='rate-row'>" +
                "<div class='" + timeClass + "'" + targetTimeBackgroundColor + ">" + targetTimePrefix + date_locale + time_locale + "</div>" +
                "<div class='" + rateClass + "'>" + valueToDisplay.toFixed(roundUnits) + unitstr + "</div>" +
                "</div>";
        }

        // If `cols` is specified, limit the responsive grid to that number of columns
        var colsSpecified = null;
        if (this._config.cols != null) {
            if (!isNaN(this._config.cols)) {
                colsSpecified = parseInt(this._config.cols);
            }
        }

        var colStyleAttr = '';
        if (colsSpecified && colsSpecified > 0) {
            if (layout === 'horizontal') {
                if (colsSpecified === 1) {
                    // Single column should take full width
                    colStyleAttr = " style='grid-template-columns: 1fr;'";
                } else {
                    // For multiple columns, use exact count with minmax that allows shrinking
                    // Calculate minimum width to ensure all columns fit: container width / cols    
                    colStyleAttr = " style='grid-template-columns: repeat(" + colsSpecified + ", minmax(max(100px, calc(100% / " + colsSpecified + " - 12px)), 1fr));'";
                }
            } else {
                // For the vertical (multi-column) layout, cap the number of columns
                colStyleAttr = " style='column-count: " + colsSpecified + ";'";
            }
        } else if (layout === 'horizontal') {
            // Default auto-fill logic when cols is not specified - maximize columns that fit
            colStyleAttr = " style='grid-template-columns: repeat(auto-fit, minmax(130.344px, 1fr));'";
        }

        var html = "<div class='rates-grid layout-" + layout + "'" + colStyleAttr + ">";
        filteredRates.forEach(function (key) { html += renderRateRow(key); });
        html += "</div>";

        this.content.innerHTML = html;
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
            // 'vertical' fills columns top-to-bottom then left-to-right.
            // 'horizontal' fills rows left-to-right, wrapping when out of space.
            // If cols is set to 1 this has no functional difference - both layouts behave the same
            layoutOrientation: 'vertical',
            // 'asc' shows most recent rates first, 'desc' shows oldest rates first.
            layoutOrder: 'asc',
            // The number of sections within the grid the card will span over, can be 'full' or a number. Each section is 12 columns wide.
            // Only applies to section based dashboards
            layoutSections: 1,
            // The number of columns within the grid the card will span over, can be 'full' or a number. Takes priority over layoutSections
            // Only applies to section based dashboards
            layoutColumns: null,
            // Number of rate columns to show - best used when reducing the number of columns to < 3 and for backwards compatibility with old table based renderer
            // If greater than the number of columns the container can fit the elements will overflow, using layoutSections/layoutColumns instead is recommended to allow auto fit
            cols: null,
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
            // If the price is above mediumlimit, the row is marked orange.
            // If the price is above lowlimit, the row is marked dark green.
            // If the price is below lowlimit, the row is marked green.
            // If the price is below 0, the row is marked blue.
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

    getCardSize() {
        // For simplicity sake this is fixed at 12 units (50px per unit)
        // This provides a reasonable height layout hint for masonry layouts for the card regardless of number of rates
        return 12;
    }

    getGridOptions () {
        return {
            columns: (() => {
                if (this._config.layoutColumns == null && this._config.layoutSections == null && this._config.cols != null && !isNaN(this._config.cols)) {
                    return 12; // Backwards compatibility with original card size - default was 1 section wide
                }

                if (this._config.layoutColumns != null) {
                    return isNaN(this._config.layoutColumns) ? this._config.layoutColumns : Math.max(5, parseInt(this._config.layoutColumns));
                }

                if (this._config.layoutSections != null) {
                    return isNaN(this._config.layoutSections) ? this._config.layoutSections : Math.max(1, parseInt(this._config.layoutSections)) * 12;
                }
                
                return 12; // Default to full 12 column (1 section) width if nothing is specified
            })()
        }
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
