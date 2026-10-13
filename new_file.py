import csv
import matplotlib.pyplot as plt
from IPython.display import display, SVG
import io
import enum
import tempfile
import subprocess
import numpy as np

COLOR_TEXTURE_1 = '#ff9999'
COLOR_TEXTURE_2 = '#66b3ff'
COLOR_TEXTURE_3 = '#99ff99'


class Type(enum.Enum):
    DONUT = 1
    BAR = 2
    SCATTER = 3
    FUNCTIONS = 4


class DonutMetadata:
    def __init__(self, svg_data, labels, values):
        print("Donut Metadata")
        if len(labels) != len(values):
            raise ValueError(
                f"labels and values must be the same length ({len(labels)} vs {len(values)})"
            )
        self.svg_data = svg_data
        self.labels = list(labels)   # labels[i] describes values[i]
        self.values = list(values)
        self.type = Type.DONUT

    def info(self):
        print("Labels and values (by index):")
        for i, (label, value) in enumerate(zip(self.labels, self.values)):
            print(f"  {i}: {label} = {value}")
        print("\nOpening SVG via system viewer...")
        # Write to a temporary file and open it using the system default handler
        with tempfile.NamedTemporaryFile(delete=False, suffix='.svg') as f:
            f.write(self.svg_data.encode('utf-8'))
            temp_path = f.name
        try:
            subprocess.run(['xdg-open', temp_path], check=True)
        except Exception as e:
            print(f"Failed to open system viewer: {e}")
            print(f"Temp file saved at: {temp_path}")


class BarMetadata:
    def __init__(self, svg_data, labels, values):
        print("Bar Metadata")
        if len(labels) != len(values):
            raise ValueError(
                f"labels and values must be the same length ({len(labels)} vs {len(values)})"
            )
        self.svg_data = svg_data
        self.labels = list(labels)   # labels[i] describes values[i]
        self.values = list(values)
        self.type = Type.BAR

    def info(self):
        print("Labels and values (by index):")
        for i, (label, value) in enumerate(zip(self.labels, self.values)):
            print(f"  {i}: {label} = {value}")
        print("\nOpening SVG via system viewer...")
        # Write to a temporary file and open it using the system default handler
        with tempfile.NamedTemporaryFile(delete=False, suffix='.svg') as f:
            f.write(self.svg_data.encode('utf-8'))
            temp_path = f.name
        try:
            subprocess.run(['xdg-open', temp_path], check=True)
        except Exception as e:
            print(f"Failed to open system viewer: {e}")
            print(f"Temp file saved at: {temp_path}")

class ScatterMetadata:
    def __init__(self, svg_data, labels, x_values, y_values, trendline):
        print("Scatter Metadata")
        if len(labels) != 2:
            raise ValueError(f"labels must be [x_label, y_label], got {len(labels)} items")
        if len(x_values) != len(y_values):
            raise ValueError(
                f"x_values and y_values must be the same length ({len(x_values)} vs {len(y_values)})"
            )
        self.svg_data = svg_data
        self.labels = list(labels)         # [x_label, y_label]
        self.x_values = list(x_values)     # x_values[i] pairs with y_values[i]
        self.y_values = list(y_values)
        self.type = Type.SCATTER
        self.trendline = trendline
 
    def info(self):
        print(f"Labels: x = {self.labels[0]}, y = {self.labels[1]}")
        print("Points (x, y) by index:")
        for i, (x, y) in enumerate(zip(self.x_values, self.y_values)):
            print(f"  {i}: ({x}, {y})")
        print("\nOpening SVG via system viewer...")
        # Write to a temporary file and open it using the system default handler
        with tempfile.NamedTemporaryFile(delete=False, suffix='.svg') as f:
            f.write(self.svg_data.encode('utf-8'))
            temp_path = f.name
        try:
            subprocess.run(['xdg-open', temp_path], check=True)
        except Exception as e:
            print(f"Failed to open system viewer: {e}")
            print(f"Temp file saved at: {temp_path}")

def generate_texture_indices(n: int) -> list[int]:
    """Generates valid 3-coloring indices ensuring no adjacent elements (and wrap-around) match."""
    if n < 3:
        raise ValueError("A chart requires at least 3 items.")
    indices = [0, 1]
    for i in range(2, n):
        forbidden = {indices[-1]}
        if i == n - 1:
            forbidden.add(indices[0])
        next_idx = next(c for c in range(3) if c not in forbidden)
        indices.append(next_idx)
    return indices


def generate_donut_svg(labels, values):
    n = len(labels)
    indices = generate_texture_indices(n)
    palette = [COLOR_TEXTURE_1, COLOR_TEXTURE_2, COLOR_TEXTURE_3]
    colors = [palette[idx] for idx in indices]

    fig, ax = plt.subplots(figsize=(6, 6))
    ax.pie(
        values,
        labels=labels,
        startangle=90,
        colors=colors,
        wedgeprops=dict(width=0.4, edgecolor='white', linewidth=2)
    )
    plt.tight_layout()

    svg_buffer = io.StringIO()
    fig.savefig(svg_buffer, format='svg')
    svg_string = svg_buffer.getvalue()
    plt.close(fig)
    return svg_string


def generate_bar_svg(labels, values):
    # Ensure labels are treated as strings/categorical identifiers
    cat_labels = [str(l) for l in labels]
    n = len(cat_labels)
    indices = generate_texture_indices(n)
    palette = [COLOR_TEXTURE_1, COLOR_TEXTURE_2, COLOR_TEXTURE_3]
    colors = [palette[idx] for idx in indices]

    fig, ax = plt.subplots(figsize=(6, 6))

    # Plot using explicit numeric positions for x, then map them to string labels
    x_positions = range(n)
    ax.bar(
        x_positions,
        values,
        color=colors,
        edgecolor='white',
        linewidth=1.5
    )

    # Force clean category labels on the x-axis, eliminating fractional ticks like 1.5
    ax.set_xticks(list(x_positions))
    ax.set_xticklabels(cat_labels)

    plt.tight_layout()

    svg_buffer = io.StringIO()
    fig.savefig(svg_buffer, format='svg')
    svg_string = svg_buffer.getvalue()
    plt.close(fig)
    return svg_string

def generate_scatter_svg(labels, x_values, y_values, trendline, trendline_degree=1):
    # labels is [x_label, y_label]
    if len(labels) != 2:
        raise ValueError(f"labels must be [x_label, y_label], got {len(labels)} items")
    if len(x_values) != len(y_values):
        raise ValueError(
            f"x_values and y_values must be the same length ({len(x_values)} vs {len(y_values)})"
        )
 
    fig, ax = plt.subplots(figsize=(6, 6))
    ax.scatter(
        x_values,
        y_values,
        s=60,
        color='black',
        edgecolor='white',
        linewidth=1.5
    )
    ax.set_xlabel(str(labels[0]))
    ax.set_ylabel(str(labels[1]))
 
    if trendline:
        # Least-squares polynomial fit; degree d needs at least d + 1 distinct x values
        if len(set(x_values)) <= trendline_degree:
            raise ValueError(
                f"A degree-{trendline_degree} trendline needs at least {trendline_degree + 1} distinct x values"
            )
        # polyfit returns trendline_degree + 1 coefficients (highest power first)
        coefficients = np.polyfit(x_values, y_values, trendline_degree)
        # Many points so curves (degree > 1) are drawn smoothly, not as one straight segment
        line_x = np.linspace(min(x_values), max(x_values), 200)
        line_y = np.polyval(coefficients, line_x)
        ax.plot(line_x, line_y, color='black', linestyle='--', linewidth=2)
 
    plt.tight_layout()
 
    svg_buffer = io.StringIO()
    fig.savefig(svg_buffer, format='svg')
    svg_string = svg_buffer.getvalue()
    plt.close(fig)
    return svg_string

def donut_from_data(filename):
    with open(filename, mode='r', newline='', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        print("gt reader")
        current_row = -1
        headers = []
        values = []
        for row in reader:
            print(row.keys())
            current_row += 1
            print(f"current row: {current_row}")
            if current_row == 0:
                print("First row")
                num_cols = len(row.keys())
                if num_cols > 5:
                    raise ValueError("Columns must be less than 5")
                headers = list(row.keys())
                for header in headers:
                    try:
                        values.append(float(row[header]))
                    except:
                        raise ValueError("No non-floatable values")
            else:
                raise ValueError("There shouldn't be more than one non-header row for donut graphs")
            print("Continuing to next row!!")

    print(values)
    sum = 0
    for value in values:
        sum += value

    # labels[i] is the CSV header for values[i]; both come from the same ordered header list
    labels = list(headers)
    # The chart itself is drawn with index labels ("0", "1", ...) that match positions in the lists
    chart_labels = [str(i) for i in range(len(labels))]

    svg_string = generate_donut_svg(chart_labels, values)
    new_donut = DonutMetadata(svg_string, labels, values)
    new_donut.info()
    return new_donut


def bar_from_data(filename):
    with open(filename, mode='r', newline='', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        current_row = -1
        headers = []
        values = []
        for row in reader:
            current_row += 1
            if current_row == 0:
                num_cols = len(row.keys())
                if num_cols > 5:
                    raise ValueError("Bar Chart: Columns must be less than 5")
                headers = list(row.keys())
                for header in headers:
                    try:
                        values.append(float(row[header]))
                    except:
                        raise ValueError("No non-floatable values")
            else:
                raise ValueError("There shouldn't be more than one non-header row for bar charts")

    sum = 0
    for value in values:
        sum += value

    # labels[i] is the CSV header for values[i]; both come from the same ordered header list
    labels = list(headers)
    chart_labels = [str(i) for i in range(len(labels))]

    svg_string = generate_bar_svg(chart_labels, values)
    new_bar = BarMetadata(svg_string, labels, values)
    new_bar.info()
    return new_bar


def scatter_from_data(filename, trendline):
    with open(filename, mode='r', newline='', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        current_row = -1
        headers = []
        x_values = []
        y_values = []
        for row in reader:
            current_row += 1
            if current_row == 0:
                num_cols = len(row.keys())
                if num_cols != 2:
                    raise ValueError("Scatter Chart: There must be exactly 2 columns (x, y)")
                headers = list(row.keys())
 
            # Convert both before appending so x_values and y_values can never fall out of step
            try:
                x = float(row[headers[0]])
                y = float(row[headers[1]])
            except (TypeError, ValueError):
                raise ValueError(f"Scatter Chart: non-numeric value in data row {current_row + 1}")
            x_values.append(x)
            y_values.append(y)
 
        print(x_values)
        print(y_values)
 
    if not x_values:
        raise ValueError("Scatter Chart: no data rows")
 
    # labels[0] / labels[1] are the CSV headers for x / y; both come from the same ordered header list
    labels = list(headers)
    # The chart itself uses short placeholder axis labels, same idea as the index labels on donut/bar
    chart_labels = ["x", "y"]
 
    svg_string = generate_scatter_svg(chart_labels, x_values, y_values, trendline)
    new_scatter = ScatterMetadata(svg_string, labels, x_values, y_values, trendline)
    new_scatter.info()
    return new_scatter


def functions_from_data(filename):
    pass


def from_data(filename, chart_type, trendline=False):
    match chart_type:
        case "donut":
            print("donuting")
            svg_object = donut_from_data(filename)
            svg_object.info()
        case "bar":
            print("B arring")
            svg_object = bar_from_data(filename)
            svg_object.info()
        case "scatter":
            scatter_from_data(filename, trendline)
        case "functions":
            functions_from_data(filename)


from_data("test_scatter.csv", "scatter", True)
#from_data("test.csv", "bar")