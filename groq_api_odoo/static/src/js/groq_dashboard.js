/** @odoo-module **/
import { registry } from "@web/core/registry";
import { Layout } from "@web/search/layout";
import { getDefaultConfig } from "@web/views/view";
import { useService } from "@web/core/utils/hooks";
import { useDebounced } from "@web/core/utils/timing";
import { session } from "@web/session";
import { Domain } from "@web/core/domain";
import { sprintf } from "@web/core/utils/strings";
import { jsonrpc } from '@web/core/network/rpc_service';

const { Component, useSubEnv, useState, onMounted, onWillStart, useRef } = owl;
import { loadJS } from "@web/core/assets";


class GroqDashboard extends Component {
    setup() {
        this.state = useState({
            question: "",
            response: [],
            chartData: null,
        });
        this.canvasRef = useRef("chartCanvas");
        this.canvasRef1 = useRef("linechartCanvas")
    }

    async askQuestion() {
        if (!this.state.question.trim()) {
            this.state.response = [];
            this.state.chartData = null;
            return;
        }

        try {
            
            const result = await jsonrpc("/web/dataset/call_kw/groq.prompt/create", {
                model: "groq.prompt",
                method: "create",
                args: [{ name: this.state.question }],
                kwargs: {},
            });

            
            const responseData = await jsonrpc("/web/dataset/call_kw/groq.prompt/read", {
                model: "groq.prompt",
                method: "read",
                args: [result], 
                kwargs: { fields: ["response"] },
            });

            let rawResponse = responseData[0]?.response || "No response received.";
            console.log("Raw AI Response:", rawResponse);

           
            let parsedResponse = rawResponse
                .split("\n")
                .filter(row => row.trim())
                .map(row => row.split(",").map(cell => cell.trim()));

            console.log("Parsed Response:", parsedResponse);

            if (parsedResponse.length > 0) {
                this.state.response = parsedResponse;

                const labels = parsedResponse.slice(1).map(row => row[0]); // X-axis
                // const values = parsedResponse.slice(1).map(row => parseFloat(row[1]) || 0); // Y-axis
                const values = parsedResponse.map(row => {
                let num = row[1].replace(/\D/g, ""); // Remove non-numeric characters from '(11'
                return num ? parseFloat(num) : 0;
            });

                console.log('----------------values----------------',values)
                console.log('----------------labels----------------',labels)


                this.state.chartData = { labels, values };

                await this.renderChart();
                await this.renderlineChart();
            } else {
                this.state.response = [["No valid data available"]];
                this.state.chartData = null;
            }
        } catch (error) {
            console.error("Error fetching AI response:", error);
            this.state.response = [["Error: Unable to get a response"]];
            this.state.chartData = null;
        }
    }

    async renderChart() {
        await loadJS("https://cdn.jsdelivr.net/npm/chart.js"); 

        const canvas = this.canvasRef.el;
        if (!canvas || !this.state.chartData) return;

        const ctx = canvas.getContext("2d");

        if (this.chartInstance) {
            this.chartInstance.destroy();
        }

        this.chartInstance = new Chart(ctx, {
            type: "bar",
            data: {
                labels: this.state.chartData.labels,
                datasets: [{
                    label: "AI Response Data",
                    data: this.state.chartData.values,
                    backgroundColor: "rgba(75, 192, 192, 0.6)",
                    borderColor: "rgba(75, 192, 192, 1)",
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }

    async renderlineChart() {
        await loadJS("https://cdn.jsdelivr.net/npm/chart.js"); 

        const canvas = this.canvasRef1.el;
        if (!canvas || !this.state.chartData) return;

        const ctx = canvas.getContext("2d");

        if (this.chartInstance1) {
            this.chartInstance1.destroy();
        }

        this.chartInstance1 = new Chart(ctx, {
            type: "line",
            data: {
                labels: this.state.chartData.labels,
                datasets: [{
                    label: "AI Response Data",
                    data: this.state.chartData.values,
                    backgroundColor: "rgba(75, 192, 192, 0.6)",
                    borderColor: "rgba(75, 192, 192, 1)",
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }
}

GroqDashboard.template = "groq_api_odoo.ai_dashboard";
registry.category("actions").add("ai_dashboard", GroqDashboard);
