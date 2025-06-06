// 1: SET GLOBAL VARIABLES
const margin = { top: 50, right: 30, bottom: 60, left: 70 };
const width = 900 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;

// Create SVG containers for both charts
const allLine = d3.select("#lineChart1") // If you change this ID, you must change it in index.html too
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

const svg2_RENAME = d3.select("#lineChart2")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);


// (If applicable) Tooltip element for interactivity
// --- INTERACTIVITY ---
    // Tooltip
    const tooltip = d3.select("body") // Create tooltip
        .append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background", "rgba(0, 0, 0, 0.7)")
        .style("color", "white")
        .style("padding", "10px")
        .style("border-radius", "5px")
        .style("font-size", "12px");


// 2.a: LOAD...
d3.csv("SPDUseofForce.csv").then(data => {
    //console.log(data);
    // 2.b: ... AND TRANSFORM DATA
    // Parsing dates (help from ChatGPT)
    const parse = d3.timeParse("%m/%d/%Y %I:%M:%S %p");
    data.forEach(d => {
        const dateObj = parse(d.Occured_date_time);
        d.date = dateObj;
        d.year = dateObj ? dateObj.getFullYear() : null;
    });
    //getting sums per year by grouping
    const totalYr = d3.groups(data, d => d.year)
    .map(([year, entries]) => ({
        year: +year,
        count: entries.length
    })).sort((a, b) => d3.ascending(a.year, b.year)); //sort so years plot properly
    console.log("Grouped Use of Force data by year:", totalYr);

   // 3.a: SET SCALES FOR CHART 1
const xScale = d3.scaleBand()
    .domain(totalYr.map(d => d.year))
    .range([0, width])
    .padding(0.1);

const yScale = d3.scaleLinear()
    .domain([0, d3.max(totalYr, d => d.count)])
    .range([height, 0]);

// 4.a: PLOT DATA FOR CHART 1 (LINE GENERATOR)
const line = d3.line()
    .x(d => xScale(d.year) + xScale.bandwidth() / 2) // center of each band
    .y(d => yScale(d.count));

// Append line path
allLine.append("path")
    .datum(totalYr)
    .attr("d", line)
    .attr("stroke", "gray")
    .attr("stroke-width", 2)
    .attr("fill", "none");

// 5.a: ADD AXES FOR CHART 1
allLine.append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(xScale).tickFormat(d3.format("d"))); // format years as plain integers

allLine.append("g")
    .call(d3.axisLeft(yScale));

// X-axis label
allLine.append("text")
    .attr("class", "axis-label")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 10)
    .attr("text-anchor", "middle")
    .text("Year");

// Y-axis label
allLine.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("y", -margin.left + 20)
    .attr("x", -height / 2)
    .attr("text-anchor", "middle")
    .text("Number of Incidents");

    // 7.a: ADD INTERACTIVITY FOR CHART 1
allLine.selectAll("circle")
    .data(totalYr)
    .enter()
    .append("circle")
    .attr("cx", d => xScale(d.year) + xScale.bandwidth() / 2)
    .attr("cy", d => yScale(d.count))
    .attr("r", 6)
    .style("fill", "blue")
    .style("opacity", 0.2)
    .on("mouseover", function(event, d) {
        tooltip.style("visibility", "visible")
            .html(`<strong>Year:</strong> ${d.year}<br><strong>Incidents:</strong> ${d.count}`)
            .style("top", (event.pageY + 10) + "px")
            .style("left", (event.pageX + 10) + "px");
        d3.select(this).style("opacity", 0.8);
    })
    .on("mouseout", function() {
        tooltip.style("visibility", "hidden");
        d3.select(this).style("opacity", 0.2);
    });

    function linearRegression(data) {
        const n = data.length;
        const sumX = d3.sum(data, d => d.year);
        const sumY = d3.sum(data, d => d.count);
        const sumXY = d3.sum(data, d => d.year * d.count);
        const sumX2 = d3.sum(data, d => d.year * d.year);

        // Calculate slope (m) and intercept (b)
        const m = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const b = (sumY - m * sumX) / n;

        // Generate points for the trendline
        const trendlineData = data.map(d => ({
            year: d.year,
            count: m * d.year + b
        }));

        return trendlineData;
    };

     function drawTrendline(data) {
        const trendlineData = linearRegression(data);

        // Remove the previous trendline if it exists
        allLine.selectAll(".trendline").remove();

        // Add the trendline path
        allLine.append("path")
            .data([trendlineData])
            .attr("class", "trendline")
            .attr("d", d3.line()
                .x(d => xScale(d.year) + xScale.bandwidth() / 2)
                .y(d => yScale(d.count))
            )
            .attr("fill", "none")
            .attr("stroke", "gray")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "5,5");
    }

    //console.log(linearRegression(data))
    const checkbox = d3.select("#trendline-toggle-useofforce");

    checkbox.on("change", function() {
        if (this.checked) {
            drawTrendline(totalYr);
        } else {
            allLine.selectAll(".trendline").remove();
        }
    });
});

