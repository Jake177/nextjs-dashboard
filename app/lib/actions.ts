'use server';
import { data } from 'autoprefixer';
import {z} from 'zod';
import { revalidatePath } from 'next/cache';
import postgres from 'postgres';
import { redirect} from 'next/navigation';
import Form from '../ui/invoices/create-form';

const sql = postgres(process.env.POSTGRES_URL!,{ssl:'require'});

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string(),
    amount:z.coerce.number(),
    status:z.enum(['paid','pending']),
    date:z.string(),
});

const CreateInvoice = FormSchema.omit({id:true,date:true});

// Use Zod to update the expcted types
const UpdateInvoice = FormSchema.omit({id:true,date:true});


// Action to create a new invoice
export async function createInvoice(formData:FormData) {
    const { customerId, amount, status } = {
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    }
    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0];

    try {
        await sql `
            INSERT INTO invoices (customer_id, amount, status, date)
            VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
        `;
    } catch (error) {
        console.error(error);
        return {
            message: 'Database error: Failed to Create Invoice',
        }
    }

    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

// Action to update an existing invoice
export async function updateInvoice(id:string, formData:FormData) {
    const {customerId,amount,status} = {
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    }
    const amountInCents = amount * 100;
    try {
        await sql `
            UPDATE invoices
            SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
            WHERE id = ${id}
        `;
    } catch (error) {
        console.error(error);
        return {
            message: 'Database error: Failed to Update Invoice',
        }
    }
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}


// Action to delete an invoice
export async function deleteInvoice(id:string) {
    try {
        await sql `
            DELETE FROM invoices WHERE id = ${id}
        `;
    } catch (error) {
        console.error(error);
        return {
            message: 'Database error: Failed to Delete Invoice',
        }
    }
    revalidatePath('/dashboard/invoices');
}