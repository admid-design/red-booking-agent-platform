import { TwilioService } from '../src/services/twilio-service';
import { BookingAgent } from '../src/agents/booking-agent';
import { ConversationState } from '../src/types';

async function exampleCall() {
    console.log('📞 === RED CONCIERGE BOOKING EXAMPLE CALL ===\n');

    const agent = new BookingAgent();
    const conversationState: ConversationState = {
        bookingId: `BK-${Date.now()}`,
        messages: [],
    };

    console.log('🤖 Agent: "Welcome to RED Concierge Booking. I can help you arrange a professional companion for your event. What date and time are you looking for?"');

    const customerInput1 = 'I need someone for tomorrow evening around 7 PM';
    console.log(`👤 Customer: "${customerInput1}"\n`);

    try {
        let { response: agentResponse1, updatedState: state1 } = await agent.processInput(
            customerInput1,
            conversationState
        );
        console.log(`🤖 Agent: "${agentResponse1}"\n`);

        const customerInput2 = 'I am in Miami, Florida. I prefer someone who speaks Spanish';
        console.log(`👤 Customer: "${customerInput2}"\n`);

        let { response: agentResponse2, updatedState: state2 } = await agent.processInput(
            customerInput2,
            state1
        );
        console.log(`🤖 Agent: "${agentResponse2}"\n`);

        console.log('🔍 Searching available hostesses in Miami...\n');
        const hostesses = await agent.findHostesses('Miami', new Date(Date.now() + 86400000));

        console.log(`✅ Found ${hostesses.length} available hostesses:`);
        hostesses.forEach((h: any) => {
            console.log(`   - ${h.name}: $${h.hourlyRate}/hour (Rating: ${h.rating}/5)`);
        });

        const customerInput3 = 'I would like to book Sofia for 3 hours';
        console.log(`\n👤 Customer: "${customerInput3}"\n`);

        let { response: agentResponse3, updatedState: state3 } = await agent.processInput(
            customerInput3,
            state2
        );
        console.log(`🤖 Agent: "${agentResponse3}"\n`);

        console.log('💳 Processing booking...\n');
        const booking = await agent.createBooking(
            'USER-001',
            'H1',
            new Date(Date.now() + 86400000),
            new Date(Date.now() + 86400000 + 10800000),
            600
        );

        console.log(`✅ Booking Created:`);
        console.log(`   📋 Reference: ${booking.bookingId}`);
        console.log(`   👤 Hostess: Sofia`);
        console.log(`   📅 Date: Tomorrow at 7:00 PM`);
        console.log(`   ⏱️  Duration: 3 hours`);
        console.log(`   💰 Total: $${booking.totalAmount}`);
        console.log(`   ✓ Status: ${booking.status}\n`);

        const customerInput4 = 'Yes, please confirm the booking';
        console.log(`👤 Customer: "${customerInput4}"\n`);

        let { response: agentResponse4, updatedState: state4 } = await agent.processInput(
            customerInput4,
            state3
        );
        console.log(`🤖 Agent: "${agentResponse4}"\n`);

        const confirmedBooking = await agent.confirmBooking(booking.bookingId);
        console.log(`✅ Booking Confirmed!`);
        console.log(`   📧 Confirmation details have been sent to your email`);
        console.log(`   🔔 You will receive a reminder 24 hours before the appointment\n`);

        console.log('📞 === CALL ENDED ===\n');
        console.log(`✨ Summary:`);
        console.log(`   Total messages exchanged: ${state4.messages.length}`);
        console.log(`   Booking reference: ${confirmedBooking.bookingId}`);
        console.log(`   Status: ${confirmedBooking.status}\n`);

    } catch (error) {
        console.error('❌ Error during call:', error);
    }
}

exampleCall().catch(console.error);
