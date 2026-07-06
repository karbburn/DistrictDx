import os
import argparse
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.colors import LinearSegmentedColormap
import geopandas as gpd
from shapely.validation import make_valid

# ── Theme System ──────────────────────────────────────────────────────────────
# Hex values exactly matching theme spec, with Light variant for readability

THEMES = {
    "light": {
        "bg_page": "#ffffff",
        "bg_surface": "#faf9f6",
        "border": "#e5e1da",
        "text_primary": "#1c1915",
        "text_secondary": "#5c5750",
        "text_muted": "#8a8377",
        "accent_saffron": "#f97316",
        "data_demand": "#16a34a",       # Deeper green for light bg contrast
        "data_realizability": "#0284c7",  # Deeper blue for light bg contrast
        "data_negative": "#dc2626",
        "confidence_low": "#78716c",
        "quadrant_star": "rgba(22, 163, 74, 0.08)",
        "quadrant_emerging": "rgba(22, 163, 74, 0.04)",
        "quadrant_underserved": "rgba(2, 132, 199, 0.04)",
        "quadrant_deprioritize": "rgba(120, 113, 108, 0.04)",
    },
    "dark": {
        "bg_page": "#0a0908",
        "bg_surface": "#14120f",
        "border": "#2a2620",
        "text_primary": "#f2ede2",
        "text_secondary": "#a8a093",
        "text_muted": "#6b6459",
        "accent_saffron": "#f97316",
        "data_demand": "#4ade80",
        "data_realizability": "#38bdf8",
        "data_negative": "#f87171",
        "confidence_low": "#57534e",
        "quadrant_star": "rgba(74, 222, 128, 0.08)",
        "quadrant_emerging": "rgba(74, 222, 128, 0.04)",
        "quadrant_underserved": "rgba(56, 189, 248, 0.04)",
        "quadrant_deprioritize": "rgba(87, 83, 78, 0.04)",
    }
}

def setup_matplotlib_style(theme):
    """Configure matplotlib global parameters to match the chosen theme."""
    t = THEMES[theme]
    
    plt.rcParams.update({
        "figure.facecolor": t["bg_page"],
        "axes.facecolor": t["bg_page"],
        "axes.edgecolor": t["border"],
        "axes.labelcolor": t["text_primary"],
        "xtick.color": t["text_secondary"],
        "ytick.color": t["text_secondary"],
        "grid.color": t["border"],
        "text.color": t["text_primary"],
        "font.family": "sans-serif",
        "font.sans-serif": ["Arial", "Helvetica", "DejaVu Sans"],
    })

# ── Colormaps & Scales ────────────────────────────────────────────────────────

def get_custom_cmap(theme, index_type):
    """Generate sequential single-hue colormaps matching theme spec."""
    t = THEMES[theme]
    bg = t["bg_page"]
    
    if index_type == "overall":
        accent = t["accent_saffron"]
    elif index_type == "chronic":
        accent = t["data_demand"]
    else:
        accent = t["data_realizability"]
        
    return LinearSegmentedColormap.from_list(f"mai_{index_type}", [bg, accent])

# ── Asset Exporter class ──────────────────────────────────────────────────────

class PPTAssetExporter:
    def __init__(self, theme="light"):
        self.theme = theme
        self.t = THEMES[theme]
        self.out_dir = "ppt-assets"
        os.makedirs(self.out_dir, exist_ok=True)
        setup_matplotlib_style(theme)
        
        # Load GeoJSON and resolve invalid geometries
        print("Loading district boundaries...")
        self.gdf = gpd.read_file("outputs/district_index_final.geojson")
        self.gdf["geometry"] = self.gdf["geometry"].apply(lambda g: make_valid(g) if g else None)
        
        # Convert numeric columns explicitly in case they were parsed as objects/strings
        numeric_cols = [
            "confidence_score", "MAI_Overall", "Future_MAI_Overall",
            "MAI_Chronic", "Future_MAI_Chronic", "MAI_Acute", "Future_MAI_Acute",
            "Demand_Overall", "Realizability_Overall", "Demand_Chronic", "Realizability_Chronic",
            "Demand_Acute", "Realizability_Acute", "census_total_population"
        ]
        for col in numeric_cols:
            if col in self.gdf.columns:
                self.gdf[col] = pd.to_numeric(self.gdf[col], errors="coerce")
        
        # Pre-dissolve state boundaries for maps overlay
        print("Dissolving state boundaries...")
        self.states_gdf = self.gdf.dissolve(by="state_name")
        
    def save_fig(self, filename):
        path = os.path.join(self.out_dir, filename)
        plt.savefig(path, dpi=300, bbox_inches="tight", facecolor=self.t["bg_page"])
        plt.close()
        print(f" Saved: {path}")

    # ── Map Export ────────────────────────────────────────────────────────────
    
    def export_maps(self):
        """Generate 6 India choropleth maps (MAI Overall/Chronic/Acute x Current/Future)"""
        print("\n--- Generating Choropleth Maps ---")
        
        scenarios = [
            ("overall", "MAI_Overall", "MAI Overall (Current)"),
            ("overall", "Future_MAI_Overall", "MAI Overall (Future Growth-Adjusted)"),
            ("chronic", "MAI_Chronic", "MAI Chronic (Current)"),
            ("chronic", "Future_MAI_Chronic", "MAI Chronic (Future Growth-Adjusted)"),
            ("acute", "MAI_Acute", "MAI Acute (Current)"),
            ("acute", "Future_MAI_Acute", "MAI Acute (Future Growth-Adjusted)"),
        ]
        
        for index_type, col, title in scenarios:
            filename = f"map_{col.lower()}.png"
            fig, ax = plt.subplots(figsize=(10, 11))
            ax.set_aspect("equal")
            
            # Setup colormap
            cmap = get_custom_cmap(self.theme, index_type)
            
            # 1. Plot all districts
            self.gdf.plot(
                column=col,
                cmap=cmap,
                linewidth=0.1,
                edgecolor=self.t["border"],
                ax=ax,
                legend=False
            )
            
            # Manually add colorbar
            sm = plt.cm.ScalarMappable(
                cmap=cmap, 
                norm=plt.Normalize(vmin=self.gdf[col].min(), vmax=self.gdf[col].max())
            )
            sm._A = []
            cbar = fig.colorbar(sm, ax=ax, orientation="horizontal", shrink=0.6, pad=0.02)
            cbar.set_label("Attractiveness Index Score", color=self.t["text_primary"], fontsize=10)
            cbar.ax.tick_params(colors=self.t["text_secondary"])
            cbar.outline.set_edgecolor(self.t["border"])
            
            # 2. Overplot low-confidence districts with a hatch pattern
            low_conf = self.gdf[self.gdf["confidence_score"] < 0.4]
            if not low_conf.empty:
                low_conf.plot(
                    ax=ax,
                    facecolor="none",
                    hatch="////",
                    edgecolor=self.t["text_muted"],
                    linewidth=0,
                    alpha=0.4
                )
            
            # 3. Plot state outlines overlay
            self.states_gdf.boundary.plot(
                ax=ax,
                color=self.t["text_secondary"],
                linewidth=0.6,
                alpha=0.7
            )
            
            # Set titles and clean axes
            ax.set_title(title, fontsize=14, fontweight="bold", pad=15)
            ax.axis("off")
            
            # Add a legend entry for low-confidence hatch
            if not low_conf.empty:
                patch = mpatches.Patch(
                    facecolor="none",
                    hatch="////",
                    edgecolor=self.t["text_muted"],
                    label="Low Confidence (<40% direct LGD data)"
                )
                ax.legend(handles=[patch], loc="upper left", frameon=True, facecolor=self.t["bg_surface"], edgecolor=self.t["border"], fontsize=9)
                
            self.save_fig(filename)

    # ── Scatter Plot Export ───────────────────────────────────────────────────

    def export_scatters(self):
        """Generate 2x2 scatters for Overall, Chronic, and Acute indices."""
        print("\n--- Generating 2x2 Scatter Plots ---")
        
        scenarios = [
            ("overall", "Demand_Overall", "Realizability_Overall", "MAI Overall: Demand vs Realizability"),
            ("chronic", "Demand_Chronic", "Realizability_Chronic", "MAI Chronic: Demand vs Realizability"),
            ("acute", "Demand_Acute", "Realizability_Acute", "MAI Acute: Demand vs Realizability"),
        ]
        
        for name, demand_col, realiz_col, title in scenarios:
            filename = f"scatter_{name}.png"
            fig, ax = plt.subplots(figsize=(8, 8))
            
            # Load values
            x = self.gdf[demand_col].values
            y = self.gdf[realiz_col].values
            pop = self.gdf["census_total_population"].fillna(1e5).values
            
            # Scale point sizes by population (clamped for visual balance)
            sizes = np.clip(pop / 20000, 10, 400)
            
            # Scatter color mapping
            color = self.t["accent_saffron"] if name == "overall" else (self.t["data_demand"] if name == "chronic" else self.t["data_realizability"])
            
            # Medians for reference lines
            x_med = np.median(x)
            y_med = np.median(y)
            
            # Tint quadrants (Star, Emerging, Underserved, Deprioritize)
            # Quadrant regions bounding boxes
            xlim = (0, 1)
            ylim = (0, 1)
            
            # Star: High D, High R (top-right)
            ax.axvspan(x_med, xlim[1], ymin=y_med, ymax=ylim[1], color=self.t["data_demand"], alpha=0.08, zorder=0)
            # Emerging: High D, Low R (bottom-right)
            ax.axvspan(x_med, xlim[1], ymin=0, ymax=y_med, color=self.t["accent_saffron"], alpha=0.04, zorder=0)
            # Underserved: Low D, High R (top-left)
            ax.axvspan(0, x_med, ymin=y_med, ymax=ylim[1], color=self.t["data_realizability"], alpha=0.04, zorder=0)
            # Deprioritize: Low D, Low R (bottom-left)
            ax.axvspan(0, x_med, ymin=0, ymax=y_med, color=self.t["text_muted"], alpha=0.04, zorder=0)
            
            # Plot reference median lines
            ax.axvline(x_med, color=self.t["text_muted"], linestyle="--", linewidth=0.8, alpha=0.7, zorder=1)
            ax.axhline(y_med, color=self.t["text_muted"], linestyle="--", linewidth=0.8, alpha=0.7, zorder=1)
            
            # Draw scatter
            ax.scatter(x, y, s=sizes, color=color, alpha=0.6, edgecolors=self.t["bg_page"], linewidths=0.5, zorder=2)
            
            # Labels and Limits
            ax.set_xlabel("Demand Axis Potential", fontsize=11, fontweight="bold", labelpad=10)
            ax.set_ylabel("Realizability / Access Capability", fontsize=11, fontweight="bold", labelpad=10)
            ax.set_title(title, fontsize=13, fontweight="bold", pad=15)
            
            ax.set_xlim(0, 1)
            ax.set_ylim(0, 1)
            ax.grid(True, linestyle=":", alpha=0.5, zorder=1)
            
            # Add quadrant text labels
            ax.text(0.95, 0.95, "Star Market\n(High D + High R)", ha="right", va="top", transform=ax.transAxes, color=self.t["data_demand"], fontweight="bold", fontsize=9)
            ax.text(0.95, 0.05, "Emerging Opportunity\n(High D + Low R)", ha="right", va="bottom", transform=ax.transAxes, color=self.t["accent_saffron"], fontweight="bold", fontsize=9)
            ax.text(0.05, 0.95, "Underserved\n(Low D + High R)", ha="left", va="top", transform=ax.transAxes, color=self.t["data_realizability"], fontweight="bold", fontsize=9)
            ax.text(0.05, 0.05, "Deprioritize\n(Low D + Low R)", ha="left", va="bottom", transform=ax.transAxes, color=self.t["text_muted"], fontweight="bold", fontsize=9)
            
            self.save_fig(filename)

    # ── Rankings Bar Chart Export ─────────────────────────────────────────────

    def export_bar_charts(self):
        """Generate Top 20 and Bottom 20 horizontal bar charts for all 3 indices."""
        print("\n--- Generating Rankings Bar Charts ---")
        
        scenarios = [
            ("overall", "MAI_Overall", "MAI Overall"),
            ("chronic", "MAI_Chronic", "MAI Chronic"),
            ("acute", "MAI_Acute", "MAI Acute"),
        ]
        
        for name, col, display_name in scenarios:
            # Sort data
            df_sorted = self.gdf.sort_values(by=col, ascending=False).copy()
            
            # Top 20
            fig, ax = plt.subplots(figsize=(10, 7))
            top_20 = df_sorted.head(20).iloc[::-1]  # reverse for horizontal plot
            
            color = self.t["accent_saffron"] if name == "overall" else (self.t["data_demand"] if name == "chronic" else self.t["data_realizability"])
            
            bars = ax.barh(top_20["district_name"] + " (" + top_20["state_name"] + ")", top_20[col], color=color, height=0.6)
            ax.set_title(f"Top 20 Districts — {display_name}", fontsize=13, fontweight="bold", pad=15)
            ax.set_xlabel("Attractiveness Index Score", fontsize=10, labelpad=8)
            ax.set_xlim(0, 1)
            
            # Add value labels
            for bar in bars:
                width = bar.get_width()
                ax.text(width + 0.01, bar.get_y() + bar.get_height()/2, f"{width:.4f}", 
                        va="center", ha="left", fontsize=9, color=self.t["text_primary"], fontfamily="monospace")
            
            self.save_fig(f"bar_{name}_top20.png")
            
            # Bottom 20
            fig, ax = plt.subplots(figsize=(10, 7))
            bottom_20 = df_sorted.tail(20)  # already sorted desc, tail gives lowest
            
            bars = ax.barh(bottom_20["district_name"] + " (" + bottom_20["state_name"] + ")", bottom_20[col], color=self.t["text_muted"], height=0.6)
            ax.set_title(f"Bottom 20 Districts — {display_name}", fontsize=13, fontweight="bold", pad=15)
            ax.set_xlabel("Attractiveness Index Score", fontsize=10, labelpad=8)
            ax.set_xlim(0, 1)
            
            # Add value labels
            for bar in bars:
                width = bar.get_width()
                ax.text(width + 0.01, bar.get_y() + bar.get_height()/2, f"{width:.4f}", 
                        va="center", ha="left", fontsize=9, color=self.t["text_primary"], fontfamily="monospace")
            
            self.save_fig(f"bar_{name}_bottom20.png")

    # ── Therapy Comparison Export ─────────────────────────────────────────────

    def export_comparison(self):
        """Generate therapy-wise (Chronic vs Acute) comparison scatter plot."""
        print("\n--- Generating Therapy Comparison Chart ---")
        
        fig, ax = plt.subplots(figsize=(9, 9))
        
        x = self.gdf["MAI_Chronic"].values
        y = self.gdf["MAI_Acute"].values
        
        # Color code by which index is larger to show specialization
        specialization = x - y
        
        # Custom color mapping based on difference
        # Blue represents Acute-dominant, Green represents Chronic-dominant
        colors = []
        for diff in specialization:
            if diff > 0.05:  # Chronic dominant
                colors.append(self.t["data_demand"])
            elif diff < -0.05:  # Acute dominant
                colors.append(self.t["data_realizability"])
            else:  # Balanced
                colors.append(self.t["accent_saffron"])
                
        scatter = ax.scatter(x, y, c=colors, alpha=0.65, edgecolors=self.t["bg_page"], linewidths=0.5, s=60)
        
        # Diagonal line representing 1:1 ratio
        ax.plot([0, 1], [0, 1], color=self.t["text_muted"], linestyle="--", linewidth=1, alpha=0.7)
        
        ax.set_xlabel("MAI Chronic Score", fontsize=11, fontweight="bold", labelpad=10)
        ax.set_ylabel("MAI Acute Score", fontsize=11, fontweight="bold", labelpad=10)
        ax.set_title("Therapy-Wise Attractiveness: Chronic vs Acute MAI", fontsize=13, fontweight="bold", pad=15)
        
        ax.set_xlim(0, 1)
        ax.set_ylim(0, 1)
        ax.grid(True, linestyle=":", alpha=0.5)
        
        # Labels for dominant regions
        ax.text(0.7, 0.2, "Chronic Portfolio Dominant\n(e.g. Obese, Aging, Hypertension)", 
                ha="center", va="center", color=self.t["data_demand"], fontsize=9, fontweight="bold", bbox=dict(facecolor=self.t["bg_surface"], alpha=0.8, edgecolor=self.t["border"]))
        
        ax.text(0.2, 0.7, "Acute Portfolio Dominant\n(e.g. Infectious disease, Child morbidity)", 
                ha="center", va="center", color=self.t["data_realizability"], fontsize=9, fontweight="bold", bbox=dict(facecolor=self.t["bg_surface"], alpha=0.8, edgecolor=self.t["border"]))
        
        # Add legend patches
        p1 = mpatches.Patch(color=self.t["data_demand"], label="Chronic-Dominant (>0.05 diff)")
        p2 = mpatches.Patch(color=self.t["data_realizability"], label="Acute-Dominant (>0.05 diff)")
        p3 = mpatches.Patch(color=self.t["accent_saffron"], label="Balanced Attractiveness")
        ax.legend(handles=[p1, p2, p3], loc="lower right", facecolor=self.t["bg_surface"], edgecolor=self.t["border"])
        
        self.save_fig("therapy_comparison.png")

# ── Main Script Entry ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Export high-resolution charts/maps for the PPT deck.")
    parser.add_argument("--theme", choices=["light", "dark"], default="light", 
                        help="Theme variant for graphics (default: light)")
    args = parser.parse_args()
    
    print(f"Initialising Asset Exporter with theme: {args.theme.upper()}")
    exporter = PPTAssetExporter(theme=args.theme)
    exporter.export_maps()
    exporter.export_scatters()
    exporter.export_bar_charts()
    exporter.export_comparison()
    print("\nAll assets exported successfully.")
