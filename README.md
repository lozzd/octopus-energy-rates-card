# Lovelace custom card for Octopus Energy Rate display

This is a fork of the original [Octopus Energy Card by Lozzd](https://github.com/lozzd/octopus-energy-rates-card). I should point out that I've made a few improvements, but don't think I'll maintain or
improve the card much further than this.

This lovelace card displays the Octopus Energy rate prices per each 30 minute slot, pulling the data from sensors of the excellent [BottlecapDave/HomeAssistant-OctopusEnergy](https://github.com/BottlecapDave/) integration.

This provides a convenient, at-a-glance way to observe the prices on tariffs that change their price every 30 minutes, for example Octopus Agile.

## Installation

### HACS

The easiest way to install it is via [HACS (Home Assistant Community Store)](https://github.com/hacs/frontend). This will ensure you get updates automatically too.

Simply click this button to go directly to the details page:

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=gaco79&repository=octopus-energy-rates-card&category=plugin)

In the Home Assistant UI:

- Use HACS -> Frontend -> Top Right Menu -> Custom repositories
- Enter a repo of `gaco79/octopus-energy-rates-card` and category of "Lovelace", and click the Add button
- Click "Explore & Download Repositories" and start searching for "octo" and you should see the entry
- Click "Download" in the bottom right

This should automatically configure all the resources, so you can now skip to **Configuration**.

### Manually

You can also install manually by downloading/copying the Javascript file in to `$homeassistant_config_dir/www/community/` and then add the Javascript file to Lovelace in the Home Assistant UI by using
Settings -> Dashboards -> Top Right Menu -> Resources

## Configuration

Add the card to your dashboard using **Add Card -> Custom: Octopus Energy Rates Card**.

You'll need to then configure the yaml yourself - the `type` part is filled out for you.

The only **required** key is the name of the entity sensor that contains the rates. At least one of the "current", "previous" or "next" day rate entities will need to be selected.

As of version 9.0.0 of the Octopus Energy integration, these entities are now called `events` and not enabled by default. In the Octopus Integration settings, filter by disabled entities and then search for the last section (e.g. `current_day_rates`) then press the button to enable the entity. It may take up to an hour for the data to be present, so don't panic if the card doesn't work immediately.

The easiest way to find that entity name is by opening the Search within Home Assistant: search for `current_rate` -> click the chosen result -> choose the Settings tab -> copy `Entity ID`.

(The format is, for example: `event.octopus_energy_electricity_{METER_SERIAL_NUMBER}}_{{MPAN_NUMBER}}_current_day_rates`)

Here's an example yaml configuration - obviously replacing `<your_id_here>` with your data from above:

```yaml
type: custom:octopus-energy-rates-card
currentEntity: event.octopus_energy_electricity_<your_id_here>_current_day_rates
title: Octopus Import
display:
  cols: 2
  hour12: false
  showday: true
  showpast: false
  unitstr: p
  roundUnits: 2
  multiplier: 100
limits:
  low: 0.15
  medium: 0.20
  high: 0.30
colours:
  low: "MediumSeaGreen"
  medium: "orange"
  high: "Tomato"
  highest: "red"
```

and here is one for export rates:

```yaml
type: custom:octopus-energy-rates-card
pastEntity: event.octopus_energy_electricity_<your_id_here>_export_previous_day_rates
currentEntity: event.octopus_energy_electricity_<your_id_here>_export_current_day_rates
futureEntity: event.octopus_energy_electricity_22l4132637_<your_id_here>_export_next_day_rates
title: Octopus Export
display:
  cols: 3
  hour12: false
  showday: false
  showpast: false
  unitstr: p
  roundUnits: 2
  multiplier: 100
limits:
  medium: 0.10
  high: 0.19
colours:
  negative: "#391CD9"
  low: "MediumSeaGreen"
  medium: "orange"
  high: "Tomato"
  highest: "red"
```

Here's a breakdown of all the available configuration items:

| Name          | Optional | Default                | Description                                                                                                                         |
| ------------- | -------- | ---------------------- | :---------------------------------------------------------------------------------------------------------------------------------- |
| currentEntity | N        | N/A                    | Name of the sensor that contains the current rates you want to render, generated from the `HomeAssistant-OctopusEnergy` integration |
| pastEntity    | Y        | N/A                    | Name of the sensor that contains the past rates you want to render, generated from the `HomeAssistant-OctopusEnergy` integration    |
| futureEntity  | Y        | N/A                    | Name of the sensor that contains the future rates you want to render, generated from the `HomeAssistant-OctopusEnergy` integration  |
| title         | Y        | "Octopus Energy Rates" | The title of the card in the dashboard                                                                                              |
| display       | Y        | See below              | Object containing display-related configuration                                                                                     |
| limits        | Y        | See below              | Object containing rate limit configurations                                                                                         |
| colours       | Y        | See below              | Object containing colour configurations for different rate levels                                                                   |

### Display Configuration

The `display` configuration allows you to customize how the rates are displayed. Here's the default configuration:

```yaml
display:
  cols: 1
  showpast: false
  showday: true
  hour12: true
  roundUnits: 2
  unitstr: "p/kWh"
  multiplier: 100
```

| Name       | Optional | Default | Description                                                                   |
| ---------- | -------- | ------- | :---------------------------------------------------------------------------- |
| cols       | Y        | 1       | How many columns to break the rates into                                      |
| showpast   | Y        | false   | Show rates that have already happened today                                   |
| showday    | Y        | true    | Shows the (short) day of the week next to the time for each rate              |
| hour12     | Y        | true    | Show times in 12-hour format if `true`, and 24-hour format if `false`         |
| roundUnits | Y        | 2       | Controls how many decimal places to round the rates to                        |
| unitstr    | Y        | "p/kWh" | The unit to show after the rate in the table. Set to an empty string for none |
| multiplier | Y        | 100     | Multiply rate values for pence (100) or pounds (1)                            |

### Limits Configuration

The `limits` configuration allows you to set thresholds for different rate levels. Here's the default configuration:

```yaml
limits:
  low: 0.15
  medium: 0.25
  high: 0.35
```

| Name   | Optional | Default | Description                           |
| ------ | -------- | ------- | :------------------------------------ |
| low    | Y        | 0.15    | Threshold for low rates (in £/kWh)    |
| medium | Y        | 0.25    | Threshold for medium rates (in £/kWh) |
| high   | Y        | 0.35    | Threshold for high rates (in £/kWh)   |

### Colour Configuration

The `colours` configuration allows you to customize the colours used for different rate levels. Here's the default colour configuration:

```yaml
colours:
  low: "MediumSeaGreen"
  medium: "orange"
  high: "Tomato"
  highest: "red"
```

You can override any of these colours in your configuration. Colours can be specified using colour names (e.g., 'red', 'blue') or hexadecimal colour codes (e.g., '#FF0000', '#0000FF').

## Screenshots

![screenshot_1](assets/import.png)
![screenshot_2](assets/export.png)

## Advanced Configurations

Import rates with the Target Rates and future rates entities specified:

```yaml
type: custom:octopus-energy-rates-card
currentEntity: event.octopus_energy_electricity_22l4132637_1900026354329_current_day_rates
futureEntity: event.octopus_energy_electricity_22l4132637_1900026354329_next_day_rates
targetTimesEntities:
  binary_sensor.octopus_energy_target_intermittent_best_charging_rates:
cols: 3
hour12: false
showday: false
showpast: false
title: Octopus Import - p/kWh
unitstr: ""
lowlimit: 6
mediumlimit: 15
highlimit: 27
cheapest: true
multiplier: 100
```

![screenshot_3](assets/import_with_target.png)

Here is an example on how you can make use of the `targetTimesEntities` property to highlight the target hours in the card. It also contains an example for `additionalDynamicLimits` property to highlight when a specific threshold is reached.

```yaml
type: custom:octopus-energy-rates-card
pastEntity: event.octopus_energy_electricity_22l4132637_1900026354329_previous_day_rates
futureEntity: event.octopus_energy_electricity_22l4132637_1900026354329_next_day_rates
currentEntity: event.octopus_energy_electricity_22l4132637_1900026354329_current_day_rates
cols: 2
showday: true
showpast: false
lowlimit: 20
mediumlimit: 20
highlimit: 30
roundUnits: 2
unitstr: p/kWh
hour12: true
cheapest: false
multiplier: 100
exportrates: false
additionalDynamicLimits:
  input_number.threshold_turn_on_air_conditioning:
    backgroundColour: DarkOliveGreen
    prefix: 💰
targetTimesEntities:
  binary_sensor.octopus_energy_target_intermittent_best_2h_rates:
    backgroundColour: orange
    prefix: ♨️
  binary_sensor.octopus_energy_target_intermittent_best_charging_rates:
    backgroundColour: navy
    prefix: 💧
```

Each entity contains the following optional properties with their default values:

```yaml
backgroundColour: navy
```

For all possible `backgroundColour` combinations, please have a look at the [valid HTML colour names](https://www.w3schools.com/colors/colors_names.asp).

If you're interested in finding emojis for `prefix`, you might find it easiest to look at [Emojipedia](https://emojipedia.org/).

You can see how the above configuration looks like in the screenshot below:

![screenshot_2](assets/screenshot_2.png)

#### Thanks/inspiration

This card was based on and reworked from the code [markgdev/home-assistant_OctopusAgile](https://github.com/markgdev/home-assistant_OctopusAgile/tree/master/custom_cards) which is no longer maintained.
