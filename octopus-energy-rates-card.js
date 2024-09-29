import {
  LitElement,
  html,
  css,
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

class OctopusEnergyRatesCard extends LitElement {
  static get properties() {
    return {
      _config: { type: Object },
      hass: { type: Object },
    };
  }

  constructor() {
    super();
    this._config = {};
  }

  setConfig(config) {
    if (!config.entities || !config.entities.current) {
      throw new Error("You need to define a current entity");
    }
    this._config = { ...OctopusEnergyRatesCard.getDefaultConfig(), ...config };
  }

  static getDefaultConfig() {
    return {
      title: "Octopus Energy Rates",
      entities: {
        current: "",
        past: "",
        future: "",
      },
      display: {
        cols: 1,
        showpast: false,
        showday: true,
        hour12: true,
        roundUnits: 2,
        unitstr: "p/kWh",
        multiplier: 100,
      },
      colours: {
        negative: "#391CD9",
        low: "MediumSeaGreen",
        medium: "orange",
        high: "Tomato",
        highest: "red",
      },
      limits: {
        low: 0.15,
        medium: 0.25,
        high: 0.35,
      },
    };
  }

  static getStubConfig() {
    return {
      title: "Octopus Energy Rates",
      entities: {
        current: "",
        past: "",
        future: "",
      },
      display: {
        cols: 1,
        showpast: false,
        showday: true,
        hour12: true,
        roundUnits: 2,
        unitstr: "p/kWh",
        multiplier: 100,
      },
      colours: {
        low: "#4CAF50", // MediumSeaGreen
        medium: "#FFA500", // Orange
        high: "#FF6347", // Tomato
        highest: "#FF0000", // Red
      },
      limits: {
        low: 0.15,
        medium: 0.25,
        high: 0.35,
      },
    };
  }

  static get styles() {
    return css`
      :host {
        display: block;
        padding: 16px;
      }
      .card-content {
        padding: 0 16px 16px;
      }
      .rate-columns {
        display: flex;
        justify-content: space-between;
      }
      .rate-column {
        flex: 1;
        padding: 0 4px;
      }
      table {
        width: 100%;
        border-spacing: 0 1px;
        border-collapse: separate;
      }
      td {
        padding: 4px;
        text-align: center;
        border-bottom-width: 1px;
        border-bottom-style: solid;
      }
      .rate {
        color: white;
        border-radius: 0 15px 15px 0;
      }
    `;
  }

  render() {
    if (!this._config || !this.hass) {
      return html``;
    }

    const { current, past, future } = this._config.entities;
    const currentStateObj = this.hass.states[current];
    const pastStateObj = past ? this.hass.states[past] : null;
    const futureStateObj = future ? this.hass.states[future] : null;

    if (!currentStateObj) {
      return html`
        <ha-card header="${this._config.title}">
          <div class="card-content">Current entity not found: ${current}</div>
        </ha-card>
      `;
    }

    const currentRates = this.getRatesFromStateObj(currentStateObj);
    const pastRates = pastStateObj
      ? this.getRatesFromStateObj(pastStateObj)
      : [];
    const futureRates = futureStateObj
      ? this.getRatesFromStateObj(futureStateObj)
      : [];

    const allRates = [...pastRates, ...currentRates, ...futureRates];
    const filteredRates = this.getFilteredRates(allRates);
    const columns = this.splitIntoColumns(filteredRates);

    return html`
      <ha-card header="${this._config.title}">
        <div class="card-content">
          <div class="rate-columns">
            ${columns.map((column) => this.renderColumn(column))}
          </div>
        </div>
      </ha-card>
    `;
  }

  getRatesFromStateObj(stateObj) {
    if (stateObj.attributes && Array.isArray(stateObj.attributes.rates)) {
      return stateObj.attributes.rates;
    } else if (
      stateObj.attributes &&
      typeof stateObj.attributes.rates === "object"
    ) {
      // Handle case where rates might be an object instead of an array
      return Object.values(stateObj.attributes.rates);
    }
    return [];
  }

  getFilteredRates(rates) {
    const { showpast } = this._config.display;
    const now = new Date();
    return rates
      .filter((rate) => {
        const rateDate = new Date(rate.start);
        return showpast || rateDate > now;
      })
      .sort((a, b) => new Date(a.start) - new Date(b.start)); // Sort rates by start time
  }

  splitIntoColumns(rates) {
    const cols = this._config.display.cols || 1;
    const columns = Array.from({ length: cols }, () => []);
    rates.forEach((rate, index) => {
      columns[index % cols].push(rate);
    });
    return columns;
  }

  renderColumn(rates) {
    return html`
      <div class="rate-column">
        <table>
          ${rates.map((rate) => this.renderRateRow(rate))}
        </table>
      </div>
    `;
  }

  renderRateRow(rate) {
    const { hour12, showday, unitstr, roundUnits, multiplier } =
      this._config.display;
    const startDate = new Date(rate.start);
    const formattedTime = startDate.toLocaleTimeString(navigator.language, {
      hour: "numeric",
      minute: "2-digit",
      hour12,
    });
    const formattedDay = showday
      ? startDate.toLocaleDateString(navigator.language, { weekday: "short" }) +
        " "
      : "";
    const rateValue = (rate.value_inc_vat * multiplier).toFixed(roundUnits);
    const color = this.getRateColor(rate.value_inc_vat);

    return html`
      <tr>
        <td
          style="border-image: linear-gradient(to right, var(--card-background-color) 20%, ${color} 100%) 1;"
        >
          ${formattedDay}${formattedTime}
        </td>
        <td
          class="rate"
          style="background-color: ${color}; border-color: ${color}"
        >
          ${rateValue}${unitstr}
        </td>
      </tr>
    `;
  }

  getRateColor(rate) {
    const { colours, limits } = this._config;
    if (rate < 0) return colours.negative || "#391CD9"; // Default to a dark blue if negative color is not set
    if (rate <= limits.low) return colours.low;
    if (rate <= limits.medium) return colours.medium;
    if (rate <= limits.high) return colours.high;
    return colours.highest;
  }

  static getConfigElement() {
    return document.createElement("octopus-energy-rates-card-editor");
  }
}

class OctopusEnergyRatesCardEditor extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      _config: { type: Object },
    };
  }

  setConfig(config) {
    this._config = { ...OctopusEnergyRatesCard.getDefaultConfig(), ...config };
  }

  render() {
    if (!this.hass || !this._config) {
      return html``;
    }

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${[
          { name: "title", selector: { text: {} } },
          {
            type: "expandable",
            name: "entities",
            title: "Entities",
            icon: "mdi:lightning-bolt",
            schema: [
              {
                name: "current",
                selector: { entity: {} },
                required: true,
              },
              {
                name: "past",
                selector: { entity: {} },
              },
              {
                name: "future",
                selector: { entity: {} },
              },
            ],
          },
          {
            type: "expandable",
            name: "display",
            title: "Display Options",
            icon: "mdi:eye",
            schema: [
              { name: "cols", selector: { number: { min: 1, max: 5 } } },
              { name: "showpast", selector: { boolean: {} } },
              { name: "showday", selector: { boolean: {} } },
              { name: "hour12", selector: { boolean: {} } },
              { name: "roundUnits", selector: { number: { min: 0, max: 3 } } },
              { name: "unitstr", selector: { text: {} } },
              {
                name: "multiplier",
                selector: { number: { min: 1, max: 100 } },
              },
            ],
          },
          {
            type: "expandable",
            name: "limits",
            title: "Rate Limits",
            icon: "mdi:chart-line",
            schema: [
              {
                name: "low",
                selector: { number: { min: 0, max: 1, step: 0.01 } },
                label: "Low Limit (£/kWh)",
              },
              {
                name: "medium",
                selector: { number: { min: 0, max: 1, step: 0.01 } },
                label: "Medium Limit (£/kWh)",
              },
              {
                name: "high",
                selector: { number: { min: 0, max: 1, step: 0.01 } },
                label: "High Limit (£/kWh)",
              },
            ],
          },
          {
            type: "expandable",
            name: "colours",
            title: "Rate Colours",
            icon: "mdi:palette",
            schema: [
              {
                name: "negative",
                selector: { text: {} },
                label: "Negative Rate Color (name or hex)",
              },
              {
                name: "low",
                selector: { text: {} },
                label: "Low Rate Color (name or hex)",
              },
              {
                name: "medium",
                selector: { text: {} },
                label: "Medium Rate Color (name or hex)",
              },
              {
                name: "high",
                selector: { text: {} },
                label: "High Rate Color (name or hex)",
              },
              {
                name: "highest",
                selector: { text: {} },
                label: "Highest Rate Color (name or hex)",
              },
            ],
          },
        ]}
        .computeLabel=${(schema) => schema.label || schema.name}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  _valueChanged(ev) {
    const config = ev.detail.value;
    this._config = config;
    this.dispatchEvent(
      new CustomEvent("config-changed", { detail: { config } })
    );
  }
}

customElements.define("octopus-energy-rates-card", OctopusEnergyRatesCard);
customElements.define(
  "octopus-energy-rates-card-editor",
  OctopusEnergyRatesCardEditor
);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "octopus-energy-rates-card",
  name: "Octopus Energy Rates Card",
  preview: false,
  description: "This card displays the energy rates for Octopus Energy",
});
