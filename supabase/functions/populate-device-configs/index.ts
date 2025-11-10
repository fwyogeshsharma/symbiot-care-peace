import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get device type IDs
    const { data: deviceTypes, error: dtError } = await supabase
      .from('device_types')
      .select('id, code')
      .in('code', ['bed_pad', 'chair_seat', 'commercial_scale', 'smart_phone', 'toilet_seat']);

    if (dtError) throw dtError;

    const configs: any[] = [];
    
    for (const dt of deviceTypes || []) {
      let deviceConfigs: any[] = [];
      
      switch (dt.code) {
        case 'bed_pad':
          deviceConfigs = [
            {
              device_type_id: dt.id,
              data_type: 'pressure',
              display_name: 'Pressure',
              unit: 'mmHg',
              value_type: 'number',
              is_required: true,
              sort_order: 1,
              sample_data_config: {
                type: 'random_number',
                min: 0,
                max: 50,
                precision: 1
              }
            },
            {
              device_type_id: dt.id,
              data_type: 'occupancy',
              display_name: 'Bed Occupancy',
              unit: null,
              value_type: 'boolean',
              is_required: true,
              sort_order: 2,
              sample_data_config: {
                type: 'boolean',
                probability: 0.7
              }
            },
            {
              device_type_id: dt.id,
              data_type: 'sleep_quality',
              display_name: 'Sleep Quality Score',
              unit: '%',
              value_type: 'number',
              is_required: false,
              sort_order: 3,
              sample_data_config: {
                type: 'random_number',
                min: 60,
                max: 100,
                precision: 0
              }
            }
          ];
          break;
          
        case 'chair_seat':
          deviceConfigs = [
            {
              device_type_id: dt.id,
              data_type: 'occupancy',
              display_name: 'Seat Occupancy',
              unit: null,
              value_type: 'boolean',
              is_required: true,
              sort_order: 1,
              sample_data_config: {
                type: 'boolean',
                probability: 0.6
              }
            },
            {
              device_type_id: dt.id,
              data_type: 'pressure',
              display_name: 'Pressure',
              unit: 'kg',
              value_type: 'number',
              is_required: true,
              sort_order: 2,
              sample_data_config: {
                type: 'random_number',
                min: 0,
                max: 100,
                precision: 1
              }
            },
            {
              device_type_id: dt.id,
              data_type: 'posture',
              display_name: 'Posture',
              unit: null,
              value_type: 'string',
              is_required: false,
              sort_order: 3,
              sample_data_config: {
                type: 'enum',
                values: ['good', 'fair', 'poor', 'slouching']
              }
            }
          ];
          break;
          
        case 'commercial_scale':
          deviceConfigs = [
            {
              device_type_id: dt.id,
              data_type: 'weight',
              display_name: 'Weight',
              unit: 'kg',
              value_type: 'number',
              is_required: true,
              sort_order: 1,
              sample_data_config: {
                type: 'random_number',
                min: 50,
                max: 120,
                precision: 2
              }
            },
            {
              device_type_id: dt.id,
              data_type: 'bmi',
              display_name: 'BMI',
              unit: null,
              value_type: 'number',
              is_required: false,
              sort_order: 2,
              sample_data_config: {
                type: 'random_number',
                min: 18,
                max: 35,
                precision: 1
              }
            },
            {
              device_type_id: dt.id,
              data_type: 'body_fat',
              display_name: 'Body Fat %',
              unit: '%',
              value_type: 'number',
              is_required: false,
              sort_order: 3,
              sample_data_config: {
                type: 'random_number',
                min: 15,
                max: 40,
                precision: 1
              }
            }
          ];
          break;
          
        case 'smart_phone':
          deviceConfigs = [
            {
              device_type_id: dt.id,
              data_type: 'gps',
              display_name: 'GPS Location',
              unit: null,
              value_type: 'object',
              is_required: true,
              sort_order: 1,
              sample_data_config: {
                type: 'gps',
                latitude: { min: -90, max: 90 },
                longitude: { min: -180, max: 180 }
              }
            },
            {
              device_type_id: dt.id,
              data_type: 'battery',
              display_name: 'Battery Level',
              unit: '%',
              value_type: 'number',
              is_required: true,
              sort_order: 2,
              sample_data_config: {
                type: 'random_number',
                min: 20,
                max: 100,
                precision: 0
              }
            },
            {
              device_type_id: dt.id,
              data_type: 'steps',
              display_name: 'Step Count',
              unit: 'steps',
              value_type: 'number',
              is_required: false,
              sort_order: 3,
              sample_data_config: {
                type: 'random_number',
                min: 0,
                max: 15000,
                precision: 0
              }
            }
          ];
          break;
          
        case 'toilet_seat':
          deviceConfigs = [
            {
              device_type_id: dt.id,
              data_type: 'usage',
              display_name: 'Usage Events',
              unit: 'times',
              value_type: 'number',
              is_required: true,
              sort_order: 1,
              sample_data_config: {
                type: 'random_number',
                min: 0,
                max: 3,
                precision: 0
              }
            },
            {
              device_type_id: dt.id,
              data_type: 'duration',
              display_name: 'Duration',
              unit: 'minutes',
              value_type: 'number',
              is_required: false,
              sort_order: 2,
              sample_data_config: {
                type: 'random_number',
                min: 1,
                max: 15,
                precision: 1
              }
            },
            {
              device_type_id: dt.id,
              data_type: 'urine_analysis',
              display_name: 'Urine Analysis',
              unit: null,
              value_type: 'string',
              is_required: false,
              sort_order: 3,
              sample_data_config: {
                type: 'enum',
                values: ['normal', 'abnormal', 'needs_review']
              }
            }
          ];
          break;
      }
      
      configs.push(...deviceConfigs);
    }

    // Insert all configurations
    const { data, error } = await supabase
      .from('device_type_data_configs')
      .insert(configs)
      .select();

    if (error) throw error;

    console.log(`Inserted ${configs.length} data configurations`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully populated ${configs.length} data configurations`,
        count: data?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error populating device configs:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
