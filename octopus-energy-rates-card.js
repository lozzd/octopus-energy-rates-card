class OctopusEnergyRatesCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.content = document.createElement('div');
        this.lastRefreshTimestamp = 0;
    }

    set hass(hass) {
        if (!this._config) return;

        const currentTime = Date.now();
        const refreshInterval = this._config.cardRefreshIntervalSeconds * 1000;
        if (currentTime - this.lastRefreshTimestamp < refreshInterval) return;

        this.lastRefreshTimestamp = currentTime;
        this.updateCard(hass);
    }

    setConfig(config) {
        if (!config.currentEntity) {
            throw new Error('You need to define a currentEntity');
        }

        this._config = { ...this.getDefaultConfig(), ...config };
        this.initializeCard();
    }

    getDefaultConfig() {
        return {
            // Entities that define target times for highlighting
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
            // Color configuration options
            colors: {
                lowest: 'LightGreen',
                low: 'MediumSeaGreen',
                medium: 'orange',
                high: 'Tomato',
                highest: 'red',
                negative: '#391CD9',
                cheapest: 'LightGreen',
                cheapestNegative: 'LightBlue'
            },
            // Low limit for rate coloring
            lowlimit: 5,
            // Medium limit for rate coloring
            mediumlimit: 20,
            // High limit for rate coloring
            highlimit: 30,
            // Entity to use for dynamic limits, above are ignored if limitEntity is set
            limitEntity: null,
            // Multiplier for high limit when using dynamic limits
            highLimitMultiplier: 1.1,
            // Multiplier for medium limit when using dynamic limits
            mediumLimitMultiplier: 0.8,
            // Controls the rounding of the units of the rate
            roundUnits: 2,
            // The unit string to show if units are shown after each rate
            unitstr: 'p/kWh',
            // Make the colouring happen in reverse, for export rates
            exportrates: false,
            // Highlight the cheapest rate
            cheapest: false,
            // Combine equal rates
            combinerate: false,
            // Multiply rate values for pence (100) or pounds (1)
            multiplier: 100,
            // Limit display to next X rows
            rateListLimit: 0,
            // How often should the card refresh in seconds
            cardRefreshIntervalSeconds: 60
        };
    }

    initializeCard() {
        const card = document.createElement('ha-card');
        card.header = this._config.title;
        this.content.style.padding = '0 16px 16px';

        const style = document.createElement('style');
        style.textContent = this.getStyles();

        card.appendChild(style);
        card.appendChild(this.content);
        this.shadowRoot.appendChild(card);
    }

    getStyles() {
        return `
            table { width: 100%; padding: 0; border-spacing: 0; }
            table.sub_table { border-collapse: separate; border-spacing: 0 2px; }
            td { vertical-align: top; padding: 2px; }
            td.time_highlight { font-weight: bold; color: white; }
            td.current { position: relative; }
            td.current:before {
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
            td.time { text-align: center; vertical-align: middle; }
            td.rate {
                color: white;
                text-align: center;
                vertical-align: middle;
                width: 80px;
                border-radius: 0 15px 15px 0;
            }
        `;
    }

    updateCard(hass) {
        const config = this._config;
        const combinedRates = this.getCombinedRates(hass);
        const allSlotsTargetTimes = this.getAllSlotsTargetTimes(hass);
        const additionalDynamicLimits = this.getAdditionalDynamicLimits(hass);
        const { lowlimit, mediumlimit, highlimit } = this.getLimits(hass);

        const { filteredRates, cheapestRate } = this.getFilteredRates(combinedRates);
        const tables = this.generateTables(filteredRates, allSlotsTargetTimes, additionalDynamicLimits, lowlimit, mediumlimit, highlimit, cheapestRate);

        this.content.innerHTML = `
        <table class="main">
            <tr>${tables}</tr>
        </table>
        `;
    }

    getCombinedRates(hass) {
        const { currentEntity, futureEntity, pastEntity } = this._config;
        const combinedRates = [];

        [pastEntity, currentEntity, futureEntity].forEach(entityId => {
            if (entityId && hass.states[entityId]) {
                const attributes = this.reverseObject(hass.states[entityId].attributes);
                const rates = attributes.rates || [];
                combinedRates.push(...rates);
            }
        });

        return combinedRates;
    }

    getAllSlotsTargetTimes(hass) {
        const allSlotsTargetTimes = [];
        const targetTimesEntities = this._config.targetTimesEntities || {};

        Object.entries(targetTimesEntities).forEach(([entityId, entityExtraData]) => {
            const entityTimesState = hass.states[entityId];
            if (entityTimesState) {
                const entityAttributes = this.reverseObject(entityTimesState.attributes);
                const targetTimes = entityAttributes.target_times || [];
                targetTimes.forEach(targetTime => {
                    allSlotsTargetTimes.push({
                        start: targetTime.start,
                        end: targetTime.end,
                        color: entityExtraData.backgroundColour || "Navy",
                        timePrefix: entityExtraData.prefix || "",
                    });
                });
            }
        });

        return allSlotsTargetTimes;
    }

    getAdditionalDynamicLimits(hass) {
        const additionalDynamicLimits = [];
        const additionalDynamicLimitsEntities = this._config.additionalDynamicLimits || {};

        Object.entries(additionalDynamicLimitsEntities).forEach(([entityId, limitExtraData]) => {
            const limit = parseFloat(hass.states[entityId].state);
            if (!isNaN(limit)) {
                additionalDynamicLimits.push({
                    limit: limit,
                    color: limitExtraData.backgroundColour || "",
                    timePrefix: limitExtraData.prefix || "",
                });
            } else {
                console.warn(`Couldn't parse entity state ${entityId} as a float`);
            }
        });

        return additionalDynamicLimits;
    }

    getLimits(hass) {
        const { lowlimit, mediumlimit, highlimit, limitEntity, highLimitMultiplier, mediumLimitMultiplier } = this._config;

        if (limitEntity && hass.states[limitEntity]) {
            const limitAve = parseFloat(hass.states[limitEntity].state);
            return {
                lowlimit: parseFloat(lowlimit),
                mediumlimit: limitAve * mediumLimitMultiplier,
                highlimit: limitAve * highLimitMultiplier,
            };
        }

        return {
            lowlimit: parseFloat(lowlimit),
            mediumlimit: parseFloat(mediumlimit),
            highlimit: parseFloat(highlimit),
        };
    }

    getFilteredRates(combinedRates) {
        const { showpast, rateListLimit, combinerate, multiplier } = this._config;
        let filteredRates = [];
        let cheapestRate = Infinity;
        let previousRate = 0;
        let previousDay = "";

        combinedRates.forEach((rate, index) => {
            const date = new Date(Date.parse(rate.start));
            const currentDay = date.toLocaleDateString(navigator.language, { weekday: 'short' });
            const rateValue = rate.value_inc_vat * multiplier;

            if ((showpast || (date - Date.now() > -1800000)) && (rateListLimit === 0 || filteredRates.length < rateListLimit)) {
                if (date - Date.now() > -1800000 && rateValue < cheapestRate) {
                    cheapestRate = rateValue;
                }

                if (!combinerate || index === 0 || currentDay !== previousDay || previousRate !== rateValue) {
                    filteredRates.push(rate);
                }

                previousRate = rateValue;
                previousDay = currentDay;
            }
        });

        return { filteredRates, cheapestRate };
    }

    generateTables(filteredRates, allSlotsTargetTimes, additionalDynamicLimits, lowlimit, mediumlimit, highlimit, cheapestRate) {
        const { cols, showday, hour12, unitstr, roundUnits, multiplier } = this._config;
        const rowsPerCol = Math.ceil(filteredRates.length / cols);
        let tables = "";
        let currentTable = "";
        let rowCount = 0;

        filteredRates.forEach((rate, index) => {
            const date = new Date(Date.parse(rate.start));
            const timeLocale = date.toLocaleTimeString(navigator.language, { hourCycle: 'h23', hour12, hour: '2-digit', minute: '2-digit' });
            const dateLocale = showday ? `${date.toLocaleDateString(navigator.language, { weekday: 'short' })} ` : '';
            const valueToDisplay = rate.value_inc_vat * multiplier;

            const { color, isTargetTime, targetTimeBackgroundColor, targetTimePrefix } = this.getRateStyle(rate, allSlotsTargetTimes, additionalDynamicLimits, valueToDisplay, cheapestRate, lowlimit, mediumlimit, highlimit);
            const isCurrentTime = date - Date.now() > -1800000 && date < new Date();
            const boldStyle = this.getBoldStyle(isCurrentTime, isTargetTime);

            currentTable += this.generateTableRow(dateLocale, timeLocale, valueToDisplay, color, boldStyle, targetTimeBackgroundColor, targetTimePrefix, unitstr, roundUnits);
            rowCount++;

            if (rowCount % rowsPerCol === 0 || index === filteredRates.length - 1) {
                tables += `<td><table class='sub_table'><tbody>${currentTable}</tbody></table></td>`;
                currentTable = "";
            }
        });

        return tables;
    }

    getRateStyle(rate, allSlotsTargetTimes, additionalDynamicLimits, valueToDisplay, cheapestRate, lowlimit, mediumlimit, highlimit) {
        const { colors, cheapest } = this._config;
        let color = colors.low;
        let isTargetTime = false;
        let targetTimeBackgroundColor = "";
        let targetTimePrefix = "";

        const date = new Date(Date.parse(rate.start));

        allSlotsTargetTimes.forEach(targetTime => {
            const startTime = new Date(targetTime.start);
            const endTime = new Date(targetTime.end);
            if (date >= startTime && date < endTime) {
                isTargetTime = true;
                targetTimeBackgroundColor = `' style='background-color: ${targetTime.color};`;
                targetTimePrefix = targetTime.timePrefix ? targetTimePrefix + targetTime.timePrefix : targetTimePrefix;
            }
        });

        additionalDynamicLimits.forEach(targetLimit => {
            if (rate.value_inc_vat <= targetLimit.limit) {
                isTargetTime = true;
                targetTimeBackgroundColor = `' style='background-color: ${targetLimit.color};`;
                targetTimePrefix = targetLimit.timePrefix ? targetTimePrefix + targetLimit.timePrefix : targetTimePrefix;
            }
        });

        targetTimePrefix = targetTimePrefix ? targetTimePrefix + " " : targetTimePrefix;

        if (cheapest && valueToDisplay === cheapestRate) {
            color = cheapestRate > 0 ? colors.cheapest : colors.cheapestNegative;
        } else if (valueToDisplay > highlimit) {
            color = colors.highest;
        } else if (valueToDisplay > mediumlimit) {
            color = colors.high;
        } else if (valueToDisplay > lowlimit) {
            color = colors.medium;
        } else if (valueToDisplay <= 0) {
            color = colors.negative;
        } else {
            color = colors.lowest;
        }

        return { color, isTargetTime, targetTimeBackgroundColor, targetTimePrefix };
    }

    getBoldStyle(isCurrentTime, isTargetTime) {
        let boldStyle = isCurrentTime ? "current " : "";
        boldStyle = isTargetTime ? boldStyle + "time_highlight" : boldStyle;
        return boldStyle;
    }

    generateTableRow(dateLocale, timeLocale, valueToDisplay, color, boldStyle, targetTimeBackgroundColor, targetTimePrefix, unitstr, roundUnits) {
        return `
            <tr class='rate_row'>
                <td class='time ${boldStyle}' style='border-bottom: 1px solid ${color}; ${targetTimeBackgroundColor}'>
                    ${targetTimePrefix}${dateLocale}${timeLocale}
                </td>
                <td class='rate' style='background-color: ${color}; border: 2px solid ${color};'>
                    ${valueToDisplay.toFixed(roundUnits)}${unitstr}
                </td>
            </tr>
        `;
    }

    reverseObject(object) {
        return Object.keys(object).reverse().reduce((reversedObj, key) => {
            reversedObj[key] = object[key];
            return reversedObj;
        }, {});
    }

    getCardSize() {
        return 3;
    }
}

customElements.define('octopus-energy-rates-card', OctopusEnergyRatesCard);

window.customCards = window.customCards || [];
window.customCards.push({
    type: 'octopus-energy-rates-card',
    name: 'Octopus Energy Rates Card',
    preview: false,
    description: 'This card displays the energy rates for Octopus Energy',
});