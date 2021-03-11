"use strict";

const svg = d3.select("#graphContainer").append("svg")

var VasicekSimulation = CreateNewSimulation()
VasicekSimulation.Initialize(svg);

var startingRate, meanInterestRate, meanReversionSpeed, volatility, term, timeSteps;

d3.select("#runButton").on("click", function () {
    $('.collapse').collapse('hide')
    RefreshUserInputs();
    VasicekSimulation.RunSimulation(
        startingRate,
        meanInterestRate,
        meanReversionSpeed,
        volatility,
        term,
        timeSteps);
});

d3.select("#clearButton").on("click", function () {
    VasicekSimulation.ResetSimulation();
});

// Put everything inside a closure
function CreateNewSimulation() {
    var svg, graphInfo, xScale, yScale, line, xExtent, yExtent;

    function Initialize(graph) {
        svg = graph;

        // Define the dimensions and axis for the graph
        graphInfo = {
            xAxisLabel: "Time (Years)",
            yAxisLabel: "Interest Rate (%)",
            height: 1200,
            width: 1200,
            marginTop: 20,
            marginBottom: 30,
            marginRight: 30,
            marginLeft: 50,
            animationDuration: 5000
        };

        svg.attr("id", "graph");
        svg.attr("viewBox", [0, 0, graphInfo.width, graphInfo.height]);

        // Define the scale for the x-axis
        xScale = d3.scaleLinear()
            .domain([0, 14])
            .range([graphInfo.marginLeft, graphInfo.width - graphInfo.marginRight]);

        // Define the scale for the y-axis
        yScale = d3.scaleLinear()
            .domain([0, 15])
            .range([graphInfo.height - graphInfo.marginBottom, graphInfo.marginTop]);

        // Define the line between points
        line = d3.line()
            .curve(d3.curveCatmullRom)
            .x(d => xScale(d.x))
            .y(d => yScale(d.y));

        AddAxis(xScale, yScale)
    }

    function RunSimulation(
        startingRate,
        meanInterestRate,
        meanReversionSpeed,
        volatility,
        term,
        timeSteps) {
        var deltaT = term / timeSteps;

        // The data points to display
        let data = [
            { orient: 'left', name: (startingRate * 100).toFixed(2), x: 0, y: startingRate * 100 },
        ];

        var currInterestRate = startingRate;
        for (let j = 1; j <= timeSteps; j++) {
            let normVar = GetNormalRandomVariable(0, 1);
            currInterestRate = currInterestRate +
                (meanReversionSpeed * (meanInterestRate - currInterestRate) * deltaT +
                volatility * normVar);
            data.push({ orient: 'left', name: (currInterestRate * 100).toFixed(2), x: deltaT * j, y: currInterestRate * 100 })
        }

        let currXExtent = d3.extent(data, d => d.x);
        let currYExtent = d3.extent(data, d => d.y);

        if (xExtent == null || yExtent == null ||
            currXExtent[0] != xExtent[0] || currXExtent[1] != xExtent[1] ||
            currYExtent[0] != yExtent[0] || currYExtent[1] != yExtent[1]) {
            xExtent = currXExtent;
            yExtent = currYExtent;

            // Define the scale for the x-axis
            xScale = d3.scaleLinear()
                .domain(xExtent).nice()
                .range([graphInfo.marginLeft, graphInfo.width - graphInfo.marginRight]);

            // Define the scale for the y-axis
            yScale = d3.scaleLinear()
                .domain(yExtent).nice()
                .range([graphInfo.height - graphInfo.marginBottom, graphInfo.marginTop]);

            UpdateAxisScale(xScale, yScale);

            // If we adjusted the scale of the graph, we have to update the location of the points that were added prior to the scale change
            d3.selectAll("path")
                .attr("d", line);
            d3.selectAll(".dataCircle")
                .attr("cx", d => xScale(d.x))
                .attr("cy", d => yScale(d.y));
            d3.selectAll(".dataCircleLabel")
                .attr("transform", d => `translate(${xScale(d.x)},${yScale(d.y)})`);
        }

        const l = Length(line(data));

        // Using https://github.com/davidmerfield/randomColor so my eyes don't bleed
        var color = randomColor();

        // Draw the line between data points
        svg.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", color)
            .attr("stroke-width", 2.5)
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round")
            .attr("stroke-dasharray", `0,${l}`)
            .attr("d", line)
            .transition()
            .duration(graphInfo.animationDuration)
            .ease(d3.easeLinear)
            .attr("stroke-dasharray", `${l},${l}`);

        // Add a little circle at each data point
        svg.append("g")
            .attr("fill", "white")
            .attr("stroke", color)
            .attr("stroke-width", 2)
            .selectAll("circle")
            .data(data.slice(1))
            .join("circle")
            .attr("class", "dataCircle")
            .attr("cx", d => xScale(d.x))
            .attr("cy", d => yScale(d.y))
            .attr("r", 3);

        // Define the label for each data point
        const label = svg.append("g")
            .attr("font-family", "sans-serif")
            .attr("font-size", 10)
            .selectAll("g")
            .data(data.slice(1))
            .join("g")
            .attr("class", "dataCircleLabel")
            .attr("transform", d => `translate(${xScale(d.x)},${yScale(d.y)})`)
            .attr("opacity", 0);

        // Put the label in the correct spot
        label.append("text")
            .text(d => d.name)
            .each(function (d) {
                const t = d3.select(this);
                switch (d.orient) {
                    case "top": t.attr("text-anchor", "middle").attr("dy", "-0.7em"); break;
                    case "right": t.attr("dx", "0.5em").attr("dy", "0.32em").attr("text-anchor", "start"); break;
                    case "bottom": t.attr("text-anchor", "middle").attr("dy", "1.4em"); break;
                    case "left": t.attr("dx", "-0.5em").attr("dy", "0.32em").attr("text-anchor", "end"); break;
                }
            });

        // Display the label once the line reaches it
        label.transition()
            .delay((d, i) => Length(line(data.slice(0, i + 1))) / l * (graphInfo.animationDuration - 125))
            .attr("opacity", 1);
    }

    function ResetAxisScale(interestRate, term) {
        // Define the domain & range for the x-axis
        xScale = d3.scaleLinear()
            .domain([0, term])
            .range([graphInfo.marginLeft, graphInfo.width - graphInfo.marginRight]);
        xExtent = null;

        // Define the domain & range for the y-axis
        yScale = d3.scaleLinear()
            .domain([interestRate - 5, interestRate + 5])
            .range([graphInfo.height - graphInfo.marginBottom, graphInfo.marginTop]);
        yExtent = null;
    }

    function AddAxis(xScale, yScale) {
        // Put the x-axis on the graph
        svg.append("g")
            .attr("id", "xAxis")
            .attr("transform", `translate(0,${graphInfo.height - graphInfo.marginBottom})`)
            .call(d3.axisBottom(xScale).ticks(graphInfo.width / 80))
            .call(g => g.select(".domain").remove())
            .call(g => g.selectAll(".tick line").clone()
                .attr("y2", -graphInfo.height)
                .attr("stroke-opacity", 0.1))
            .call(g => g.append("text")
                .attr("x", graphInfo.width - 4)
                .attr("y", -4)
                .attr("font-weight", "bold")
                .attr("text-anchor", "end")
                .attr("fill", "black")
                .text(graphInfo.xAxisLabel));

        // Put the y-axis on the graph
        svg.append("g")
            .attr("id", "yAxis")
            .attr("transform", `translate(${graphInfo.marginLeft},0)`)
            .call(d3.axisLeft(yScale).ticks(null, ".2f"))
            .call(g => g.select(".domain").remove())
            .call(g => g.selectAll(".tick line").clone()
                .attr("x2", graphInfo.width)
                .attr("stroke-opacity", 0.1))
            .call(g => g.select(".tick:last-of-type text").clone()
                .attr("x", 4)
                .attr("text-anchor", "start")
                .attr("font-weight", "bold")
                .attr("fill", "black")
                .text(graphInfo.yAxisLabel));
    }

    function UpdateAxisScale(xScale, yScale) {
        svg.select("#xAxis").remove();
        svg.select("#yAxis").remove();
        AddAxis(xScale, yScale);
    }

    // Box-Muller algo for getting a normally distributed random variable
    function GetNormalRandomVariable(mean, stddev) {
        var u1 = Math.random();
        var u2 = Math.random();

        var normalRandVar = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return normalRandVar * stddev + mean;
    }

    function ClearGraph() {
        svg.selectAll("svg > *").remove();
        ResetAxisScale(8, 14);
        AddAxis(xScale, yScale);
    }

    // Determine the length of the given path
    function Length(path) {
        return d3.create("svg:path").attr("d", path).node().getTotalLength();
    }

    return {
        Initialize: Initialize,
        RunSimulation: RunSimulation,
        ResetSimulation: ClearGraph
    }
};

function RefreshUserInputs() {
    // Collect all the user inputs
    startingRate = Number(d3.select("#startingInterestRateInput").node().value);
    meanInterestRate = Number(d3.select("#meanInterestRateInput").node().value);
    meanReversionSpeed = Number(d3.select("#meanReversionSpeedInput").node().value);
    volatility = Number(d3.select("#volatilityInput").node().value);
    term = Number(d3.select("#termInput").node().value);
    timeSteps = Number(d3.select("#timeStepsInput").node().value);
};
