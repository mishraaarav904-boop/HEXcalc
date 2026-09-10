export interface UnitCategory {
  id: string;
  name: string;
  units: { id: string; name: string; symbol: string; toBase: (val: number) => number; fromBase: (val: number) => number }[];
}

export const UNIT_CATEGORIES: UnitCategory[] = [
  {
    id: 'length',
    name: 'Length',
    units: [
      { id: 'm', name: 'Meters', symbol: 'm', toBase: val => val, fromBase: val => val },
      { id: 'km', name: 'Kilometers', symbol: 'km', toBase: val => val * 1000, fromBase: val => val / 1000 },
      { id: 'cm', name: 'Centimeters', symbol: 'cm', toBase: val => val * 0.01, fromBase: val => val / 0.01 },
      { id: 'mm', name: 'Millimeters', symbol: 'mm', toBase: val => val * 0.001, fromBase: val => val / 0.001 },
      { id: 'nm', name: 'Nanometers', symbol: 'nm', toBase: val => val * 1e-9, fromBase: val => val / 1e-9 },
      { id: 'angstrom', name: 'Angstroms', symbol: 'Å', toBase: val => val * 1e-10, fromBase: val => val / 1e-10 },
      { id: 'mile', name: 'Miles', symbol: 'mi', toBase: val => val * 1609.344, fromBase: val => val / 1609.344 },
      { id: 'ft', name: 'Feet', symbol: 'ft', toBase: val => val * 0.3048, fromBase: val => val / 0.3048 },
      { id: 'in', name: 'Inches', symbol: 'in', toBase: val => val * 0.0254, fromBase: val => val / 0.0254 },
      { id: 'ly', name: 'Light Years', symbol: 'ly', toBase: val => val * 9.4607e15, fromBase: val => val / 9.4607e15 },
    ]
  },
  {
    id: 'mass',
    name: 'Mass',
    units: [
      { id: 'kg', name: 'Kilograms', symbol: 'kg', toBase: val => val, fromBase: val => val },
      { id: 'g', name: 'Grams', symbol: 'g', toBase: val => val * 0.001, fromBase: val => val / 0.001 },
      { id: 'mg', name: 'Milligrams', symbol: 'mg', toBase: val => val * 1e-6, fromBase: val => val / 1e-6 },
      { id: 'lb', name: 'Pounds', symbol: 'lb', toBase: val => val * 0.45359237, fromBase: val => val / 0.45359237 },
      { id: 'oz', name: 'Ounces', symbol: 'oz', toBase: val => val * 0.0283495231, fromBase: val => val / 0.0283495231 },
      { id: 'amu', name: 'Atomic Mass Units', symbol: 'u', toBase: val => val * 1.6605390666e-27, fromBase: val => val / 1.6605390666e-27 },
    ]
  },
  {
    id: 'time',
    name: 'Time',
    units: [
      { id: 's', name: 'Seconds', symbol: 's', toBase: val => val, fromBase: val => val },
      { id: 'ms', name: 'Milliseconds', symbol: 'ms', toBase: val => val * 0.001, fromBase: val => val / 0.001 },
      { id: 'us', name: 'Microseconds', symbol: 'μs', toBase: val => val * 1e-6, fromBase: val => val / 1e-6 },
      { id: 'ns', name: 'Nanoseconds', symbol: 'ns', toBase: val => val * 1e-9, fromBase: val => val / 1e-9 },
      { id: 'min', name: 'Minutes', symbol: 'min', toBase: val => val * 60, fromBase: val => val / 60 },
      { id: 'hr', name: 'Hours', symbol: 'hr', toBase: val => val * 3600, fromBase: val => val / 3600 },
      { id: 'day', name: 'Days', symbol: 'd', toBase: val => val * 86400, fromBase: val => val / 86400 },
      { id: 'year', name: 'Years', symbol: 'yr', toBase: val => val * 31536000, fromBase: val => val / 31536000 },
    ]
  },
  {
    id: 'energy',
    name: 'Energy',
    units: [
      { id: 'j', name: 'Joules', symbol: 'J', toBase: val => val, fromBase: val => val },
      { id: 'kj', name: 'Kilojoules', symbol: 'kJ', toBase: val => val * 1000, fromBase: val => val / 1000 },
      { id: 'ev', name: 'Electronvolts', symbol: 'eV', toBase: val => val * 1.602176634e-19, fromBase: val => val / 1.602176634e-19 },
      { id: 'mev', name: 'Megaelectronvolts', symbol: 'MeV', toBase: val => val * 1.602176634e-13, fromBase: val => val / 1.602176634e-13 },
      { id: 'cal', name: 'Calories', symbol: 'cal', toBase: val => val * 4.184, fromBase: val => val / 4.184 },
      { id: 'kcal', name: 'Kilocalories', symbol: 'kcal', toBase: val => val * 4184, fromBase: val => val / 4184 },
      { id: 'kwh', name: 'Kilowatt-hours', symbol: 'kWh', toBase: val => val * 3.6e6, fromBase: val => val / 3.6e6 },
    ]
  },
  {
    id: 'temperature',
    name: 'Temperature',
    units: [
      { id: 'k', name: 'Kelvin', symbol: 'K', toBase: val => val, fromBase: val => val },
      { id: 'c', name: 'Celsius', symbol: '°C', toBase: val => val + 273.15, fromBase: val => val - 273.15 },
      { id: 'f', name: 'Fahrenheit', symbol: '°F', toBase: val => (val - 32) * (5 / 9) + 273.15, fromBase: val => (val - 273.15) * (9 / 5) + 32 },
    ]
  },
  {
    id: 'pressure',
    name: 'Pressure',
    units: [
      { id: 'pa', name: 'Pascals', symbol: 'Pa', toBase: val => val, fromBase: val => val },
      { id: 'kpa', name: 'Kilopascals', symbol: 'kPa', toBase: val => val * 1e3, fromBase: val => val / 1e3 },
      { id: 'mpa', name: 'Megapascals', symbol: 'MPa', toBase: val => val * 1e6, fromBase: val => val / 1e6 },
      { id: 'bar', name: 'Bar', symbol: 'bar', toBase: val => val * 1e5, fromBase: val => val / 1e5 },
      { id: 'atm', name: 'Standard Atmospheres', symbol: 'atm', toBase: val => val * 101325, fromBase: val => val / 101325 },
      { id: 'psi', name: 'Pounds per Square Inch', symbol: 'psi', toBase: val => val * 6894.757, fromBase: val => val / 6894.757 },
      { id: 'torr', name: 'Torr / mmHg', symbol: 'Torr', toBase: val => val * 133.322368, fromBase: val => val / 133.322368 },
    ]
  },
  {
    id: 'force',
    name: 'Force',
    units: [
      { id: 'n', name: 'Newtons', symbol: 'N', toBase: val => val, fromBase: val => val },
      { id: 'kn', name: 'Kilonewtons', symbol: 'kN', toBase: val => val * 1e3, fromBase: val => val / 1e3 },
      { id: 'mn', name: 'Meganewtons', symbol: 'MN', toBase: val => val * 1e6, fromBase: val => val / 1e6 },
      { id: 'lbf', name: 'Pounds-force', symbol: 'lbf', toBase: val => val * 4.4482216, fromBase: val => val / 4.4482216 },
      { id: 'dyn', name: 'Dynes', symbol: 'dyn', toBase: val => val * 1e-5, fromBase: val => val / 1e-5 },
    ]
  },
  {
    id: 'speed',
    name: 'Speed & Velocity',
    units: [
      { id: 'mps', name: 'Meters per second', symbol: 'm/s', toBase: val => val, fromBase: val => val },
      { id: 'kmh', name: 'Kilometers per hour', symbol: 'km/h', toBase: val => val / 3.6, fromBase: val => val * 3.6 },
      { id: 'mph', name: 'Miles per hour', symbol: 'mph', toBase: val => val * 0.44704, fromBase: val => val / 0.44704 },
      { id: 'knot', name: 'Knots', symbol: 'kn', toBase: val => val * 0.514444, fromBase: val => val / 0.514444 },
      { id: 'fps', name: 'Feet per second', symbol: 'ft/s', toBase: val => val * 0.3048, fromBase: val => val / 0.3048 },
      { id: 'c', name: 'Speed of Light (c)', symbol: 'c', toBase: val => val * 299792458, fromBase: val => val / 299792458 },
    ]
  }
];
