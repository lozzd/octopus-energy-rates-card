# Lovelace custom card for Octopus Energy Rate display

This lovelace card displays the Octpus Energy rate prices per each 30 minute slot, pulling the
data from sensors of the the excellent [BottlecapDave/HomeAssistant-OctopusEnergy](https://github.com/BottlecapDave/)
integration.

This provides a convenient, at a glance way to observe the prices on tariffs that change the
price every 30 minutes, for example Octopus Agile.


#### Installation
The easiest way to install it is via [HACS (Home Assistant Community Store)](https://github.com/hacs/frontend).

You can also install manually by copying the Javascript file in to `$homeassistant_config_dir/www/community/` and then add the Javascript file to Lovelace in the Home Assistant UI by using
Settings -> Dashboards -> Top Right Menu -> Resources

#### Configuration
Add the card to your dashboard using **Add Card -> Manual**

Using the YAML configuration, you could use an example configuration as such (ensuring you pick the name of the entity sensor that contains the rates) 

```
entity: sensor.octopus_energy_electricity_<your_id_here_current_rate
type: custom:octopus-energy-rates-card
cols: 2
mediumlimit: 20
highlimit: 30
showday: true
showpast: false
```

Here's a breakdown of the available configuration items:

| Name        | Optional | Default       | Description                                                                                                                                          |
|-------------|----------|---------------|:-----------------------------------------------------------------------------------------------------------------------------------------------------|
| entity      | N        | N/A           | Name of the sensor that contains the rates you want to render, generated from the `HomeAssistant-OctopusEnergy` integration                          |
| cols        | Y        | 1             | How many columns to break the rates in to, pick the one that fits best with how wide your card is                                                    |
| showpast    | Y        | false         | Show the rates that have already happened today. Provides a simpler card when there are two days of dates to show                                    |
| showday     | Y        | false         | Shows the (short) day of the week next to the time for each rate. Helpful if it's not clear which day is which if you have a lot of rates to display |
| title       | Y        | "Agile Rates" | The title of the card in the dashboard                                                                                                               |
| mediumlimit | Y        | 20 (pence)    | If the price is above `mediumlimit`, the row is marked yellow                                                                                        |
| highlimit   | Y        | 30 (pence)    | If the price is above `highlimit`, the row is marked red.                                                                                            |
| roundUnits  | Y        | 2             | Controls how many decimal places to round the rates to                                                                                               |
| showunits   | Y        | true          | Controls whether the prices are printed with the unit (p/kWh)                                                                                        |


#### A note on colouring

* The card is hardcoded to display plunge pricing (e.g, below 0p/kWh as blue). 
* If the price is above `highlimit`, then the row is in red
* If the price is above `mediumlimit`, then the row is coloured orange/yellow
* Otherwise, the row is coloured is green. 

#### Screenshot
Coming soon

#### Thanks/inspiration
This card was based on and reworked from the code [markgdev/home-assistant_OctopusAgile](https://github.com/markgdev/home-assistant_OctopusAgile/tree/master/custom_cards) which is no longer maintained. 