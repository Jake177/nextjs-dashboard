import {Lato,My_Soul,Lusitana} from 'next/font/google';

const lato = Lato({
    subsets: ['latin'],
    weight: ['300', '400', '700'],
});

const my_soul = My_Soul({
    subsets: ['latin'],
    weight: ['400'],
});

const lusitana = Lusitana({
    subsets: ['latin'],
    weight: ['400', '700']
});


export { lato, my_soul, lusitana };