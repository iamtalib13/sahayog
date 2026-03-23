frappe.pages['petty-cash-access-ma'].on_page_load = function(wrapper) { 
    let page = frappe.ui.make_app_page({ 
        parent: wrapper, 
        title: 'Test Petite-Vue', 
        single_column: true 
    }); 
 
    frappe.require('/assets/sahayog/js/petite-vue.iife.js', () => { 
        page.main.html(` 
            <div id="app" v-scope @vue:mounted="init()"> 
                <div style="padding: 40px; max-width: 600px; margin: 0 auto;"> 
                    <div style="background: white; padding: 30px;  
                         border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"> 
                        <h2>Petite-Vue Test</h2> 
 
                        <div style="background: #d1fae5; padding: 20px;  
                             border-radius: 8px; margin: 20px 0;"> 
                            <p style="margin: 0; font-size: 18px;"> 
                                <strong>Status:</strong> [[ status ]] 
                            </p> 
                        </div> 
 
                        <div style="text-align: center; margin: 30px 0;"> 
                            <div style="font-size: 72px; font-weight: bold;  
                                 color: #3b82f6;"> 
                                [[ count ]] 
                            </div> 
                        </div> 
 
                        <div style="text-align: center;"> 
                            <button @click="testVue()"  
                                style="padding: 12px 24px; background: #3b82f6;  
                                color: white; border: none; border-radius: 8px;  
                                cursor: pointer; font-size: 16px;"> 
                                Test Vue 
                            </button> 
                        </div> 
 
                        <div v-if="working" style="background: #10b981;  
                             color: white; padding: 15px; border-radius: 8px;  
                             margin-top: 20px; text-align: center;"> 
                            Petite-Vue is Working 
                        </div> 
                    </div> 
                </div> 
            </div> 
        `); 
 
        PetiteVue.createApp({ 
            $delimiters: ['[[', ']]'], 
            status: 'Ready to test', 
            count: 0, 
            working: false, 
 
            testVue() { 
                this.count++; 
                this.working = true; 
                this.status = 'Working! Clicked ' + this.count + ' times'; 
 
                frappe.show_alert({ 
                    message: 'Petite-Vue is working', 
                    indicator: 'green' 
                }, 3); 
            }, 
 
            init() { 
                console.log('Petite-Vue initialized'); 
                frappe.show_alert({ 
                    message: 'Petite-Vue loaded', 
                    indicator: 'blue' 
                }, 2); 
            } 
        }).mount('#app'); 
    }); 
}; 
